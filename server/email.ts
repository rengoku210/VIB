import 'dotenv/config';
import nodemailer, { Transporter } from 'nodemailer';
import { db } from './db.js';
import crypto from 'node:crypto';

export interface EmailLogEntry {
  id: string;
  recipient: string;
  subject: string;
  template_name: string;
  status: 'delivered' | 'failed' | 'mock_logged' | 'queued';
  error_message?: string | null;
  context_json?: string;
  sent_at: string;
  retry_count: number;
}

const ADMIN_EMAIL = process.env.VIB_ADMIN_EMAIL || 'thevibofficial@gmail.com';
const SUPPORT_WHATSAPP = '+91 9181801766';
const PLATFORM_NAME = 'VIB Digital Services';
const SENDER_EMAIL = process.env.SMTP_FROM || 'support@vib.gg';

// Nodemailer transport initialization
let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  );
}

export function getTransporter(): Transporter | null {
  if (!transporter && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log(`[Email Service] Connected to SMTP server ${process.env.SMTP_HOST}`);
    } catch (err) {
      console.warn('[Email Service] Failed to initialize SMTP transporter:', err);
    }
  }
  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateName?: string;
  context?: Record<string, any>;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; logId: string; error?: string }> {
  const logId = 'eml_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const transport = getTransporter();

  let status: 'delivered' | 'failed' | 'mock_logged' = 'mock_logged';
  let errorMessage: string | null = null;

  if (process.env.RESEND_API_KEY) {
    try {
      const rawFrom = (process.env.RESEND_FROM_EMAIL || 'noreply@huxzain.shop').trim();
      let fromAddr = rawFrom;
      if (fromAddr.startsWith('<') && fromAddr.endsWith('>')) {
        fromAddr = fromAddr.slice(1, -1).trim();
      }
      if (!fromAddr.includes('<')) {
        fromAddr = `VIB <${fromAddr}>`;
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject,
        }),
      });
      const data: any = await res.json().catch(() => ({}));
      if (res.ok) {
        status = 'delivered';
        console.log(`[Email Service - Resend] Email sent to ${options.to} (${options.subject}) - ID: ${data.id}`);
      } else {
        status = 'failed';
        errorMessage = data.message || JSON.stringify(data);
        console.error(`[Email Service - Resend] Delivery failed to ${options.to}:`, data);
      }
    } catch (err: any) {
      status = 'failed';
      errorMessage = err.message || String(err);
      console.error(`[Email Service - Resend] Network error:`, err);
    }
  } else if (transport) {
    try {
      await transport.sendMail({
        from: `"${PLATFORM_NAME}" <${SENDER_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.subject,
      });
      status = 'delivered';
      console.log(`[Email Service - SMTP] Email sent successfully to ${options.to} (${options.subject})`);
    } catch (err: any) {
      status = 'failed';
      errorMessage = err.message || String(err);
      console.error(`[Email Service - SMTP] Failed to deliver email to ${options.to}:`, err);
    }
  } else {
    // Graceful Diagnostic Mode (when neither Resend nor SMTP credentials provided)
    status = 'mock_logged';
    console.log(`[Email Service Mock] Logged email to ${options.to} [Template: ${options.templateName || 'custom'}]: ${options.subject}`);
  }

  // Persist delivery log in SQLite database
  try {
    db.prepare(`
      INSERT INTO email_logs (id, recipient, subject, template_name, status, error_message, context_json, sent_at, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      logId,
      options.to,
      options.subject,
      options.templateName || 'general',
      status,
      errorMessage,
      JSON.stringify(options.context || {}),
      now
    );
  } catch (err) {
    console.warn('[Email Service] Could not write email log to database:', err);
  }

  return { success: status === 'delivered' || status === 'mock_logged', logId, error: errorMessage || undefined };
}

// ---------------------------------------------------------------------------
// Standard VIB Email Templates & Workflows
// ---------------------------------------------------------------------------

export async function sendOrderPendingVerificationEmail(order: any): Promise<void> {
  const details = typeof order.details_json === 'string' ? JSON.parse(order.details_json) : (order.details || {});
  const riotId = details.riotId || order.riot_id || 'Not Provided';
  const trackUrl = `${process.env.APP_URL || 'http://localhost:3000'}/?page=track&orderId=${order.id}`;
  const adminUrl = `${process.env.APP_URL || 'http://localhost:3000'}/?page=admin`;

  // 1. Email to Customer
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #a855f7; border-bottom: 2px solid #3b0764; padding-bottom: 8px;">VIB DIGITAL SERVICES - ORDER CONFIRMATION</h2>
      <p>Hello,</p>
      <p>Thank you for your order on the VIB Digital Services Platform! We have received your order details and your payment is currently <strong>AWAITING VERIFICATION</strong> by our financial verification desk.</p>
      
      <div style="background-color: #1a162b; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #4c1d95;">
        <p><strong>Order Reference:</strong> <span style="color: #38bdf8;">#${order.id}</span></p>
        <p><strong>Product / Package:</strong> ${order.title}</p>
        <p><strong>Amount:</strong> ₹${order.amount} ${order.currency || 'INR'}</p>
        <p><strong>Riot ID / Tag:</strong> ${riotId}</p>
        <p><strong>Payment Status:</strong> SUBMITTED_FOR_VERIFICATION</p>
        <p><strong>Payment Reference (UTR):</strong> ${order.payment_evidence_ref || 'Pending Verification'}</p>
      </div>

      <p><strong>What Happens Next:</strong></p>
      <ol style="line-height: 1.6;">
        <li>Our staff verifies your payment reference against our banking records (typically 5–15 minutes).</li>
        <li>For Indian VP orders, a genuine VP redemption PIN will be issued directly to your email immediately upon approval.</li>
        <li>For Regional VP packs (PHP, IDR, etc.), our representative will coordinate fulfillment with you via WhatsApp.</li>
      </ol>

      <p style="margin: 20px 0;">
        <a href="${trackUrl}" style="background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
          Track Live Order Status
        </a>
      </p>

      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 13px;">
        Need urgent assistance? WhatsApp our official support desk at <strong>${SUPPORT_WHATSAPP}</strong> with your order reference.
      </p>
    </div>
  `;

  const targetEmail = details.email || order.user_email || order.buyer_email || 'thevibofficial@gmail.com';

  await sendEmail({
    to: targetEmail,
    subject: `Order Received & Awaiting Verification: #${order.id}`,
    html: customerHtml,
    templateName: 'order_pending_verification',
    context: { orderId: order.id, amount: order.amount, title: order.title, riotId },
  });

  // 2. Notification to Administrator (thevibofficial@gmail.com)
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #1e1b2e; color: #ffffff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #f59e0b;">ACTION REQUIRED: New Order #${order.id}</h2>
      <p>A customer has created an order. Payment evidence may arrive separately before staff review.</p>
      
      <ul>
        <li><strong>Order ID:</strong> #${order.id}</li>
        <li><strong>Item:</strong> ${order.title}</li>
        <li><strong>Type:</strong> ${order.type || 'vp'}</li>
        <li><strong>Amount:</strong> ₹${order.amount}</li>
        <li><strong>Customer Email:</strong> ${details.email || 'N/A'}</li>
        <li><strong>Riot ID:</strong> ${riotId}</li>
        <li><strong>Payment UTR / Ref:</strong> ${order.payment_evidence_ref || 'None'}</li>
        <li><strong>Payment Screenshot:</strong> ${order.payment_evidence_image ? 'Attached / Available in Admin Panel' : 'None'}</li>
      </ul>

      <p>
        <a href="${adminUrl}" style="background-color: #d97706; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Open Admin Orders Queue
        </a>
      </p>
    </div>
  `;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[ADMIN ALERT] New Order #${order.id} - ₹${order.amount} (${order.title})`,
    html: adminHtml,
    templateName: 'admin_order_notification',
    context: { orderId: order.id, amount: order.amount, title: order.title, riotId },
  });
}

export async function sendIndianVPCodeIssuedEmail(order: any, vpCode: string): Promise<void> {
  const details = typeof order.details_json === 'string' ? JSON.parse(order.details_json) : (order.details || {});
  const riotId = details.riotId || order.riot_id || 'Your Account';
  const trackUrl = `${process.env.APP_URL || 'http://localhost:3000'}/?page=track&orderId=${order.id}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #10b981; border-bottom: 2px solid #064e3b; padding-bottom: 8px;">VIB DIGITAL SERVICES - VP CODE ISSUED!</h2>
      <p>Hello,</p>
      <p>Your payment for <strong>${order.title}</strong> has been successfully verified by our operations team. Your genuine Valorant Points code is ready below!</p>
      
      <div style="background-color: #064e3b; border: 2px dashed #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #a7f3d0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">YOUR OFFICIAL RIOT VP PIN</p>
        <div style="font-family: monospace; font-size: 26px; font-weight: bold; color: #ffffff; letter-spacing: 3px; background: #022c22; padding: 12px; border-radius: 6px; display: inline-block;">
          ${vpCode}
        </div>
      </div>

      <div style="background-color: #1a162b; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <h4 style="color: #c084fc; margin-top: 0;">How to Redeem Your VP in Valorant:</h4>
        <ol style="line-height: 1.8; color: #e2e8f0; font-size: 14px;">
          <li>Launch VALORANT on PC and log in to Riot Account <strong>${riotId}</strong>.</li>
          <li>Click the <strong>V (Valorant Points) icon</strong> in the top-right corner of the in-game store.</li>
          <li>Select <strong>Prepaid Cards & Codes</strong> under payment methods.</li>
          <li>Enter your code: <strong style="color: #10b981;">${vpCode}</strong> and click <strong>Submit</strong>.</li>
          <li>Your VP points will be credited immediately to your in-game balance!</li>
        </ol>
      </div>

      <p style="margin: 20px 0;">
        <a href="${trackUrl}" style="background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
          View Invoice & Order Record
        </a>
      </p>

      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 13px;">
        Order #${order.id} | Official VIB Warranty Guaranteed | Support: ${SUPPORT_WHATSAPP}
      </p>
    </div>
  `;

  const targetEmail = details.email || order.user_email || order.buyer_email || 'thevibofficial@gmail.com';

  await sendEmail({
    to: targetEmail,
    subject: `Your Valorant Points Code for Order #${order.id} [${order.title}]`,
    html,
    templateName: 'vp_code_delivered',
    context: { orderId: order.id, vpCode, title: order.title, riotId },
  });
}

export async function sendInventoryShortageAlert(order: any): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #2b1111; color: #ffffff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #ef4444;">[CRITICAL ALERT] Indian VP Inventory Shortage!</h2>
      <p>Order #${order.id} was verified for payment, but <strong>NO AVAILABLE UNUSED CODE</strong> was found in inventory for package <code>${order.package_id || order.title}</code>.</p>
      <p><strong>Action Taken:</strong> The order has been maintained in <code>FULFILLMENT_PENDING</code> state. No fake code was issued.</p>
      <p>Please restock codes immediately in the Admin Console &gt; VP Code Inventory.</p>
    </div>
  `;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[INVENTORY ALERT] VP Stock Out for Order #${order.id} (${order.title})`,
    html,
    templateName: 'admin_inventory_shortage',
    context: { orderId: order.id, packageId: order.package_id, title: order.title },
  });
}

export async function sendPaymentRejectedEmail(order: any, reason: string): Promise<void> {
  const details = typeof order.details_json === 'string' ? JSON.parse(order.details_json) : (order.details || {});
  const trackUrl = `${process.env.APP_URL || 'http://localhost:3000'}/?page=track&orderId=${order.id}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #ef4444; border-bottom: 2px solid #7f1d1d; padding-bottom: 8px;">PAYMENT VERIFICATION UNRESOLVED</h2>
      <p>Hello,</p>
      <p>We were unable to verify the payment submitted for your order <strong>#${order.id}</strong> (${order.title}).</p>
      
      <div style="background-color: #450a0a; border: 1px solid #ef4444; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <p><strong>Reason provided by staff:</strong></p>
        <p style="color: #fca5a5;">${reason || 'The transaction UTR reference did not match our banking ledger, or the payment proof was illegible.'}</p>
      </div>

      <p><strong>How to Resolve:</strong></p>
      <p>Please log into your account, visit your order tracking page, and re-submit a valid banking UTR and clear screenshot, or contact our support desk directly on WhatsApp at <strong>${SUPPORT_WHATSAPP}</strong>.</p>

      <p style="margin: 20px 0;">
        <a href="${trackUrl}" style="background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
          Review Order & Resubmit Proof
        </a>
      </p>
    </div>
  `;

  const targetEmail = details.email || order.user_email || order.buyer_email || 'thevibofficial@gmail.com';

  await sendEmail({
    to: targetEmail,
    subject: `Payment Verification Update for Order #${order.id}`,
    html,
    templateName: 'payment_rejected',
    context: { orderId: order.id, reason, title: order.title },
  });
}

export async function sendOrderPaymentVerifiedEmail(order: any, isManualDelivery: boolean = true): Promise<void> {
  const details = typeof order.details_json === 'string' ? JSON.parse(order.details_json) : (order.details || {});
  const customerEmail = details.email || order.user_email || order.buyer_email || ADMIN_EMAIL;
  const trackUrl = `${process.env.APP_URL || 'http://localhost:3000'}/?page=track&orderId=${order.id}`;
  const phone = details.contactPhone || details.phone || order.phone || 'Not specified';

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #a855f7; border-bottom: 2px solid #581c87; padding-bottom: 8px;">PAYMENT VERIFIED • ORDER CONFIRMED</h2>
      <p>Hello,</p>
      <p>Your payment of <strong>₹${Number(order.amount).toLocaleString('en-IN')}</strong> for <strong>${order.title}</strong> has been officially confirmed by VIB Administration!</p>
      
      <div style="background-color: #1a162b; border: 1px solid #7c3aed; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #c084fc; margin-top: 0;">Order Status: Manual Escrow Fulfillment Underway</h3>
        <p style="color: #e2e8f0; font-size: 14px; margin-bottom: 8px;">
          This product (${order.type || 'Service / Account'}) requires manual middleman dispatch and live account coordination.
        </p>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
          <strong>Dispatch Phone / WhatsApp:</strong> ${phone}<br/>
          <strong>Delivery Email:</strong> ${customerEmail}
        </p>
      </div>

      <div style="background-color: #0f172a; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <h4 style="color: #38bdf8; margin-top: 0;">Next Steps for Delivery:</h4>
        <ol style="line-height: 1.8; color: #cbd5e1; font-size: 14px;">
          <li>Visit your <strong>Confirmed Order View</strong> or <strong>Order Room</strong> to confirm or update your WhatsApp number or email if needed.</li>
          <li>Our assigned middleman specialist will connect with you to safely transfer account credentials or coordinate match schedules.</li>
          <li>For immediate assistance, reach our 24/7 Operations Desk on WhatsApp: <strong>${SUPPORT_WHATSAPP}</strong>.</li>
        </ol>
      </div>

      <p style="margin: 20px 0;">
        <a href="${trackUrl}" style="background-color: #9333ea; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
          Open Confirmed Order &amp; Delivery Room
        </a>
      </p>

      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 13px;">
        Order #${order.id} | VIB Escrow Guarantee Protected | Support WhatsApp: ${SUPPORT_WHATSAPP}
      </p>
    </div>
  `;

  await sendEmail({
    to: customerEmail,
    subject: `Payment Confirmed: Order #${order.id} [${order.title}] - Manual Delivery In Progress`,
    html,
    templateName: 'order_payment_verified_manual',
    context: { orderId: order.id, amount: order.amount, title: order.title, isManualDelivery },
  });
}

export async function sendPasswordRecoveryOtpEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #a855f7; border-bottom: 2px solid #581c87; padding-bottom: 8px;">VIB ACCOUNT PASSWORD RECOVERY</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password on VIB Digital Services. Use the recovery code below to choose a new password:</p>
      
      <div style="background-color: #1a162b; border: 2px dashed #9333ea; padding: 18px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <span style="font-family: monospace; font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: 4px;">
          ${code}
        </span>
      </div>

      <p style="color: #cbd5e1; font-size: 13px;">
        Enter this code in the password reset window. This code will expire in 15 minutes.
      </p>
      <p style="color: #94a3b8; font-size: 12px;">
        If you did not request this password reset, please ignore this email or contact support if you suspect unauthorized activity.
      </p>

      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        VIB Official Security Desk | Support WhatsApp: ${SUPPORT_WHATSAPP}
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Your VIB Password Recovery Code: ${code}`,
    html,
    text: `Your VIB password recovery code is: ${code}. It expires in 15 minutes.`,
    templateName: 'password_recovery_otp',
    context: { email, code },
  });
}

export async function sendWelcomeVerificationEmail(user: { email: string; name?: string; code: string }): Promise<void> {
  const code = user.code;
  const name = user.name || 'Gamer';
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #a855f7; border-bottom: 2px solid #581c87; padding-bottom: 8px;">WELCOME TO VIB DIGITAL SERVICES</h2>
      <p>Hello ${name},</p>
      <p>Thank you for creating your account on VIB. Your verification code is below:</p>
      
      <div style="background-color: #1a162b; border: 2px dashed #a855f7; padding: 18px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <span style="font-family: monospace; font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: 4px;">
          ${code}
        </span>
      </div>

      <p style="color: #cbd5e1; font-size: 13px;">
        Your account is active. You can now browse verified Valorant listings, top up genuine VP, and track orders securely with Escrow protection.
      </p>

      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        VIB Official Escrow Platform | Support WhatsApp: ${SUPPORT_WHATSAPP}
      </p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: `Welcome to VIB! Your Verification Code: ${code}`,
    html,
    text: `Welcome to VIB! Your verification code is: ${code}`,
    templateName: 'welcome_verification',
    context: { email: user.email, code },
  });
}

export async function sendOrderFulfilledEmail(order: any, fulfillmentNote?: string): Promise<void> {
  const details = typeof order.details_json === 'string' ? JSON.parse(order.details_json) : (order.details || {});
  const customerEmail = details.email || order.user_email || order.buyer_email || ADMIN_EMAIL;
  const trackUrl = `${process.env.APP_URL || 'http://localhost:3000'}/?page=track&orderId=${order.id}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #10b981; border-bottom: 2px solid #064e3b; padding-bottom: 8px;">ORDER COMPLETED &amp; FULFILLED!</h2>
      <p>Hello,</p>
      <p>Great news! Your order <strong>#${order.id}</strong> (<strong>${order.title}</strong>) has been fully completed by our operations team.</p>
      
      <div style="background-color: #064e3b; border: 1px solid #10b981; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <p style="margin: 0; color: #ecfdf5; font-size: 14px;">
          <strong>Status:</strong> COMPLETED<br/>
          <strong>Product:</strong> ${order.title}<br/>
          <strong>Amount:</strong> ₹${Number(order.amount).toLocaleString('en-IN')}<br/>
          ${fulfillmentNote ? `<strong>Delivery Notes:</strong> ${fulfillmentNote}` : ''}
        </p>
      </div>

      <p style="margin: 20px 0;">
        <a href="${trackUrl}" style="background-color: #10b981; color: #022c22; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
          View Confirmed Order Summary
        </a>
      </p>

      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 13px;">
        Order #${order.id} | Thank you for choosing VIB Digital Services! | Support WhatsApp: ${SUPPORT_WHATSAPP}
      </p>
    </div>
  `;

  await sendEmail({
    to: customerEmail,
    subject: `Order Fulfilled: #${order.id} [${order.title}]`,
    html,
    templateName: 'order_fulfilled',
    context: { orderId: order.id, title: order.title, fulfillmentNote },
  });
}

const AD_ADMIN_EMAIL = 'teamvibofficial@gmail.com';

export async function sendAdminAdOrderNotification(order: any, appBaseUrl?: string): Promise<void> {
  const baseUrl = appBaseUrl || process.env.APP_URL || 'https://vib-rho.vercel.app';
  const adminVerifyLink = `${baseUrl}/?page=admin&tab=advertisements&order=${order.id}`;
  const screenshotUrl = order.payment_screenshot?.startsWith('http')
    ? order.payment_screenshot
    : `${baseUrl}${order.payment_screenshot || ''}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #a855f7; border-bottom: 2px solid #6b21a8; padding-bottom: 8px;">NEW ADVERTISEMENT ORDER &amp; PAYMENT SUBMITTED</h2>
      <p>A customer has placed an advertisement order and submitted manual payment evidence.</p>
      
      <div style="background-color: #1a162b; border: 1px solid #7e22ce; padding: 18px; border-radius: 8px; margin: 16px 0; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 8px 0;"><strong>ORDER ID:</strong> ${order.id}</p>
        <p style="margin: 0 0 8px 0;"><strong>ADVERTISEMENT PACKAGE:</strong> ${order.plan_name}</p>
        <p style="margin: 0 0 8px 0;"><strong>PACKAGE PRICE:</strong> ₹${Number(order.plan_price).toLocaleString('en-IN')}</p>
        <p style="margin: 0 0 8px 0;"><strong>CUSTOMER NAME:</strong> ${order.customer_name}</p>
        <p style="margin: 0 0 8px 0;"><strong>CUSTOMER EMAIL:</strong> ${order.customer_email}</p>
        <p style="margin: 0 0 8px 0;"><strong>WHATSAPP NUMBER:</strong> ${order.customer_phone}</p>
        <p style="margin: 0 0 8px 0;"><strong>PAYMENT REFERENCE / UTR:</strong> ${order.payment_reference || 'N/A'}</p>
        <p style="margin: 0;"><strong>PAYMENT SCREENSHOT:</strong> <a href="${screenshotUrl}" target="_blank" style="color: #38bdf8;">View Uploaded Screenshot</a></p>
      </div>

      <p style="margin: 24px 0;">
        <a href="${adminVerifyLink}" style="background-color: #a855f7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
          Open Admin Panel to Verify &amp; Approve Payment
        </a>
      </p>

      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        VIB 2.0 Master Operations Engine | Sent to ${AD_ADMIN_EMAIL}
      </p>
    </div>
  `;

  const text = `
NEW ADVERTISEMENT ORDER:
ORDER ID: ${order.id}
ADVERTISEMENT PACKAGE: ${order.plan_name}
PACKAGE PRICE: ₹${order.plan_price}
CUSTOMER NAME: ${order.customer_name}
CUSTOMER EMAIL: ${order.customer_email}
WHATSAPP NUMBER: ${order.customer_phone}
PAYMENT REFERENCE: ${order.payment_reference || 'N/A'}
SCREENSHOT: ${screenshotUrl}
ADMIN VERIFICATION LINK: ${adminVerifyLink}
  `.trim();

  await sendEmail({
    to: AD_ADMIN_EMAIL,
    subject: `[NEW AD ORDER] ${order.plan_name} (₹${order.plan_price}) - #${order.id}`,
    html,
    text,
    templateName: 'admin_ad_order_notification',
    context: { orderId: order.id, customerName: order.customer_name },
  });
}

export async function sendCustomerAdPaymentApproved(order: any, appBaseUrl?: string): Promise<void> {
  const baseUrl = appBaseUrl || process.env.APP_URL || 'https://vib-rho.vercel.app';
  const submitUrl = `${baseUrl}/?page=advertise&step=submit&orderId=${order.id}&token=${order.submission_token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #10b981; border-bottom: 2px solid #064e3b; padding-bottom: 8px;">PAYMENT VERIFIED! SUBMIT YOUR ADVERTISEMENT DETAILS</h2>
      <p>Hello ${order.customer_name},</p>
      <p>Your payment for <strong>${order.plan_name}</strong> (Order <strong>#${order.id}</strong>) has been verified and confirmed by our team.</p>
      
      <p style="color: #cbd5e1; font-size: 14px; margin: 16px 0;">
        Please click the secure button below to submit your account inventory details, screenshots, and Instagram contact handle so we can launch your promotional campaign.
      </p>

      <p style="margin: 24px 0; text-align: center;">
        <a href="${submitUrl}" style="background-color: #9333ea; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 0 20px rgba(147, 51, 234, 0.4);">
          Continue to Submit Advertisement Details
        </a>
      </p>

      <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">
        Or copy and paste this link in your browser:<br/>
        <a href="${submitUrl}" style="color: #38bdf8; word-break: break-all;">${submitUrl}</a>
      </p>

      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        VIB Official Escrow Platform | Support WhatsApp: ${SUPPORT_WHATSAPP}
      </p>
    </div>
  `;

  await sendEmail({
    to: order.customer_email,
    subject: `Payment Verified: Continue to Submit Advertisement Details [#${order.id}]`,
    html,
    text: `Hello ${order.customer_name}, your payment for ${order.plan_name} has been verified. Submit your details here: ${submitUrl}`,
    templateName: 'customer_ad_payment_approved',
    context: { orderId: order.id, customerName: order.customer_name, submitUrl },
  });
}

export async function sendCustomerAdPaymentRejected(order: any, reason?: string): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #ef4444; border-bottom: 2px solid #7f1d1d; padding-bottom: 8px;">PAYMENT VERIFICATION UPDATE</h2>
      <p>Hello ${order.customer_name},</p>
      <p>We were unable to verify the payment reference for your order <strong>#${order.id}</strong> (<strong>${order.plan_name}</strong>).</p>
      
      <div style="background-color: #2a111a; border: 1px solid #f43f5e; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <p style="margin: 0; color: #fecdd3; font-size: 14px;">
          <strong>Reason:</strong> ${reason || 'Transaction UTR could not be matched with bank ledger or screenshot unreadable.'}
        </p>
      </div>

      <p style="color: #cbd5e1; font-size: 13px;">
        If you have already transferred the amount, please reach out to our dedicated support team on WhatsApp at <strong>${SUPPORT_WHATSAPP}</strong> with your Order ID (#${order.id}) and bank debit statement.
      </p>

      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        VIB Support Desk | ${SUPPORT_WHATSAPP}
      </p>
    </div>
  `;

  await sendEmail({
    to: order.customer_email,
    subject: `Payment Verification Notice for Order #${order.id}`,
    html,
    text: `Hello ${order.customer_name}, we were unable to verify payment for order #${order.id}. Reason: ${reason || 'UTR could not be matched'}. Contact WhatsApp ${SUPPORT_WHATSAPP}.`,
    templateName: 'customer_ad_payment_rejected',
    context: { orderId: order.id, customerName: order.customer_name, reason },
  });
}

export async function sendAdminAdDetailsSubmitted(order: any, details: any, appBaseUrl?: string): Promise<void> {
  const baseUrl = appBaseUrl || process.env.APP_URL || 'https://vib-rho.vercel.app';
  const screenshotLink = details.inventory_screenshot?.startsWith('http')
    ? details.inventory_screenshot
    : `${baseUrl}${details.inventory_screenshot || ''}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #a855f7; border-bottom: 2px solid #6b21a8; padding-bottom: 8px;">NEW CUSTOMER ADVERTISEMENT SUBMISSION</h2>
      <p>Customer has completed their advertisement details submission form. Here are the details for publication:</p>
      
      <div style="background-color: #1a162b; border: 1px solid #a855f7; padding: 18px; border-radius: 8px; margin: 16px 0; font-size: 14px; line-height: 1.8;">
        <p style="margin: 0;"><strong>ADVERTISEMENT PACKAGE:</strong> ${order.plan_name}</p>
        <p style="margin: 0;"><strong>PACKAGE PRICE:</strong> ₹${Number(order.plan_price).toLocaleString('en-IN')}</p>
        <p style="margin: 0;"><strong>CUSTOMER NAME:</strong> ${details.customer_name || order.customer_name}</p>
        <p style="margin: 0;"><strong>CUSTOMER EMAIL:</strong> ${details.customer_email || order.customer_email}</p>
        <p style="margin: 0;"><strong>WHATSAPP NUMBER:</strong> ${details.customer_phone || order.customer_phone}</p>
        <p style="margin: 0;"><strong>INSTAGRAM USERNAME:</strong> ${details.instagram_username || 'N/A'}</p>
        <p style="margin: 0;"><strong>SELLING PRICE:</strong> ₹${details.selling_price || 'N/A'}</p>
        <p style="margin: 0;"><strong>CURRENT RANK:</strong> ${details.current_rank || 'N/A'}</p>
        <p style="margin: 0;"><strong>PREMIUM SKINS LIST:</strong><br/><pre style="background: #0d0b17; padding: 10px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; color: #e2e8f0;">${details.premium_skins || 'None provided'}</pre></p>
        <p style="margin: 0;"><strong>OTHER VALUABLE ITEMS:</strong><br/><pre style="background: #0d0b17; padding: 10px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; color: #e2e8f0;">${details.other_valuable_items || 'None provided'}</pre></p>
        <p style="margin: 0;"><strong>LINK TO INVENTORY SCREENSHOT:</strong> <a href="${screenshotLink}" target="_blank" style="color: #38bdf8;">View Inventory Screenshot</a></p>
      </div>

      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        VIB 2.0 Master Operations Engine | Sent to ${AD_ADMIN_EMAIL}
      </p>
    </div>
  `;

  const text = `
ADVERTISEMENT PACKAGE: ${order.plan_name}
PACKAGE PRICE: ₹${order.plan_price}
CUSTOMER NAME: ${details.customer_name || order.customer_name}
CUSTOMER EMAIL: ${details.customer_email || order.customer_email}
WHATSAPP NUMBER: ${details.customer_phone || order.customer_phone}
INSTAGRAM USERNAME: ${details.instagram_username}
SELLING PRICE: ₹${details.selling_price}
CURRENT RANK: ${details.current_rank}

PREMIUM SKINS LIST:
${details.premium_skins}

OTHER VALUABLE ITEMS:
${details.other_valuable_items}

LINK TO INVENTORY SCREENSHOT: ${screenshotLink}
  `.trim();

  await sendEmail({
    to: AD_ADMIN_EMAIL,
    subject: `[AD SUBMITTED] ${order.plan_name} - @${details.instagram_username || order.customer_name}`,
    html,
    text,
    templateName: 'admin_ad_details_submitted',
    context: { orderId: order.id, customerName: order.customer_name, instagram: details.instagram_username },
  });
}


