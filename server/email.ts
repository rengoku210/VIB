import 'dotenv/config';
import nodemailer, { Transporter } from 'nodemailer';
import { db } from './db.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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
  attachments?: Array<{
    filename: string;
    content: string; // base64 string
    contentType?: string;
  }>;
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
      const resendPayload: any = {
        from: fromAddr,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text || options.subject,
      };
      if (options.attachments && options.attachments.length > 0) {
        resendPayload.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
        }));
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resendPayload),
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
        attachments: options.attachments,
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

export async function sendRegistrationOtpEmail(email: string, code: string, name?: string): Promise<{ success: boolean; error?: string }> {
  const greeting = name ? `Hello ${name},` : 'Hello Gamer,';
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #a855f7; border-bottom: 2px solid #581c87; padding-bottom: 8px;">VIB ACCOUNT REGISTRATION CODE</h2>
      <p>${greeting}</p>
      <p>Thank you for registering on VIB Digital Services. Please use the 6-digit verification code below to verify your email address and activate your account:</p>
      
      <div style="background-color: #1a162b; border: 2px dashed #9333ea; padding: 18px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #ffffff; letter-spacing: 6px;">
          ${code}
        </span>
      </div>

      <p style="color: #cbd5e1; font-size: 13px;">
        This code is valid for 10 minutes. Never share this code with anyone.
      </p>
      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        VIB Official Security Desk | Support WhatsApp: ${SUPPORT_WHATSAPP}
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Your VIB Verification Code: ${code}`,
    html,
    text: `Your VIB verification code is: ${code}. Valid for 10 minutes.`,
    templateName: 'registration_otp',
    context: { email, code },
  });
}

export async function sendLoginOtpEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #a855f7; border-bottom: 2px solid #581c87; padding-bottom: 8px;">VIB SIGN-IN VERIFICATION CODE</h2>
      <p>Hello,</p>
      <p>Use the 6-digit one-time code below to securely sign in to your VIB account:</p>
      
      <div style="background-color: #1a162b; border: 2px dashed #9333ea; padding: 18px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #ffffff; letter-spacing: 6px;">
          ${code}
        </span>
      </div>

      <p style="color: #cbd5e1; font-size: 13px;">
        This code is valid for 10 minutes. If you did not request this code, please contact our support team immediately.
      </p>
      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        VIB Official Security Desk | Support WhatsApp: ${SUPPORT_WHATSAPP}
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Your VIB Sign-In Code: ${code}`,
    html,
    text: `Your VIB sign-in code is: ${code}. Valid for 10 minutes.`,
    templateName: 'login_otp',
    context: { email, code },
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
  const baseUrl = (appBaseUrl || process.env.APP_URL || 'https://vib-rho.vercel.app').replace(/\/+$/, '');
  
  // Extract screenshots list (up to 3)
  const screenshots: string[] = Array.isArray(details.inventory_screenshots) && details.inventory_screenshots.length > 0
    ? details.inventory_screenshots.slice(0, 3)
    : (details.inventory_screenshot ? [details.inventory_screenshot] : []);

  // Build file attachments for raw downloads
  const attachments: Array<{ filename: string; content: string }> = [];
  screenshots.forEach((shot, idx) => {
    if (shot.startsWith('data:image/')) {
      const match = shot.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        attachments.push({
          filename: `inventory_screenshot_${idx + 1}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`,
          content: match[2],
        });
      }
    } else if (shot.startsWith('/uploads/')) {
      const localPath = path.join(process.cwd(), 'data', shot);
      if (fs.existsSync(localPath)) {
        try {
          const buf = fs.readFileSync(localPath);
          const ext = path.extname(localPath).replace('.', '') || 'jpg';
          attachments.push({
            filename: `inventory_screenshot_${idx + 1}.${ext}`,
            content: buf.toString('base64'),
          });
        } catch {}
      }
    }
  });

  const whatsappContactStatus = details.whatsapp_contact_enabled === 1 || details.whatsapp_contact_enabled === true
    ? '<span style="color: #10b981; font-weight: bold;">ENABLED</span> (Buyers can contact directly on WhatsApp)'
    : '<span style="color: #f59e0b; font-weight: bold;">DISABLED</span> (Private - Contact via Instagram tag only)';

  const screenshotsHtml = screenshots.length > 0
    ? `
      <div style="margin-top: 20px;">
        <h3 style="color: #c084fc; font-size: 15px; margin: 0 0 12px 0; text-transform: uppercase;">
          Main Profile / Inventory Screenshots (${screenshots.length} of 3 uploaded):
        </h3>
        ${screenshots.map((s, i) => {
          const fullLink = s.startsWith('http') || s.startsWith('data:') ? s : `${baseUrl}${s.startsWith('/') ? '' : '/'}${s}`;
          return `
            <div style="background-color: #0d0b17; border: 1px solid #4c1d95; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
              <div style="font-size: 12px; color: #a78bfa; margin-bottom: 8px; font-weight: bold;">
                Screenshot #${i + 1}
                ${!s.startsWith('data:') ? `<a href="${fullLink}" target="_blank" style="color: #38bdf8; margin-left: 10px; text-decoration: underline;">Open High-Res Link</a>` : ''}
              </div>
              <img src="${fullLink}" alt="Inventory Screenshot ${i + 1}" style="max-width: 100%; max-height: 480px; display: block; border-radius: 6px; border: 1px solid #7c3aed;" />
            </div>
          `;
        }).join('')}
      </div>
    `
    : '<p style="color: #ef4444;">No inventory screenshot provided.</p>';

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #07050f; color: #ffffff; padding: 24px; border-radius: 12px; max-width: 700px; margin: 0 auto; border: 1px solid #3b2a59;">
      <div style="border-bottom: 2px solid #9333ea; padding-bottom: 14px; margin-bottom: 18px;">
        <span style="background-color: #2e1065; color: #c084fc; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
          PROMOTION SUBMISSION RECEIVED
        </span>
        <h2 style="color: #ffffff; margin: 10px 0 4px 0; font-size: 22px;">
          ${order.plan_name}
        </h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
          Order Reference: <strong style="color: #f1f5f9;">#${order.id}</strong> | Amount Paid: <strong style="color: #34d399;">₹${Number(order.plan_price).toLocaleString('en-IN')}</strong>
        </p>
      </div>

      <div style="background-color: #120e24; border: 1px solid #581c87; border-radius: 8px; padding: 18px; margin-bottom: 18px;">
        <h3 style="color: #c084fc; font-size: 14px; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #2e1065; padding-bottom: 6px;">
          Seller & Profile Details
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #e2e8f0;">
          <tr>
            <td style="padding: 6px 0; width: 40%; color: #94a3b8;"><strong>Selling Price You Want:</strong></td>
            <td style="padding: 6px 0; font-size: 15px; font-weight: bold; color: #34d399;">₹${Number(details.selling_price).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;"><strong>Instagram Username:</strong></td>
            <td style="padding: 6px 0; font-weight: bold; color: #f472b6;">
              <a href="https://instagram.com/${details.instagram_username}" target="_blank" style="color: #f472b6; text-decoration: underline;">
                @${details.instagram_username}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;"><strong>WhatsApp Number:</strong></td>
            <td style="padding: 6px 0; font-weight: bold; color: #ffffff;">
              <a href="https://wa.me/${String(details.customer_phone).replace(/[^0-9]/g, '')}" target="_blank" style="color: #22c55e; text-decoration: underline;">
                ${details.customer_phone}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;"><strong>WhatsApp Direct Contact:</strong></td>
            <td style="padding: 6px 0;">${whatsappContactStatus}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;"><strong>Email Address:</strong></td>
            <td style="padding: 6px 0; color: #ffffff;">${details.customer_email || order.customer_email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;"><strong>Customer Name:</strong></td>
            <td style="padding: 6px 0; color: #ffffff;">${details.customer_name || order.customer_name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;"><strong>Current Rank:</strong></td>
            <td style="padding: 6px 0; font-weight: bold; color: #fbbf24;">${details.current_rank || 'N/A'}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #120e24; border: 1px solid #581c87; border-radius: 8px; padding: 18px; margin-bottom: 18px;">
        <h3 style="color: #c084fc; font-size: 14px; text-transform: uppercase; margin-top: 0; margin-bottom: 8px;">
          Premium Skins & Collections
        </h3>
        <pre style="background-color: #080612; border: 1px solid #3b2a59; border-radius: 6px; padding: 12px; color: #f1f5f9; font-family: monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; margin: 0;">${details.premium_skins || 'None provided'}</pre>
      </div>

      ${details.other_valuable_items ? `
        <div style="background-color: #120e24; border: 1px solid #581c87; border-radius: 8px; padding: 18px; margin-bottom: 18px;">
          <h3 style="color: #c084fc; font-size: 14px; text-transform: uppercase; margin-top: 0; margin-bottom: 8px;">
            Other Valuable Items
          </h3>
          <pre style="background-color: #080612; border: 1px solid #3b2a59; border-radius: 6px; padding: 12px; color: #cbd5e1; font-family: monospace; font-size: 12px; line-height: 1.5; white-space: pre-wrap; margin: 0;">${details.other_valuable_items}</pre>
        </div>
      ` : ''}

      ${screenshotsHtml}

      <div style="border-top: 1px solid #2e1065; padding-top: 16px; margin-top: 24px; text-align: center; color: #64748b; font-size: 12px;">
        VIB 2.0 Operations Engine | Sent to ${AD_ADMIN_EMAIL}
      </div>
    </div>
  `;

  const text = `
NEW CUSTOMER ADVERTISEMENT SUBMISSION
====================================
ORDER ID: #${order.id}
PACKAGE: ${order.plan_name} (₹${order.plan_price})

CUSTOMER DETAILS:
- Name: ${details.customer_name || order.customer_name}
- Email: ${details.customer_email || order.customer_email}
- WhatsApp Number: ${details.customer_phone} (Direct Contact: ${details.whatsapp_contact_enabled ? 'ENABLED' : 'DISABLED'})
- Instagram: @${details.instagram_username}
- Selling Price: ₹${details.selling_price}
- Current Rank: ${details.current_rank}

PREMIUM SKINS / COLLECTIONS:
${details.premium_skins}

OTHER VALUABLE ITEMS:
${details.other_valuable_items || 'None provided'}

SCREENSHOTS (${screenshots.length} uploaded):
${screenshots.map((s, i) => `#${i + 1}: ${s.startsWith('http') ? s : `${baseUrl}${s}`}`).join('\n')}
  `.trim();

  await sendEmail({
    to: AD_ADMIN_EMAIL,
    subject: `[PROMOTION DETAILS] @${details.instagram_username} - ₹${details.selling_price} - ${order.plan_name} [#${order.id}]`,
    html,
    text,
    templateName: 'admin_ad_details_submitted',
    context: {
      orderId: order.id,
      customerName: details.customer_name,
      instagram: details.instagram_username,
      price: details.selling_price,
    },
    attachments: attachments.length > 0 ? attachments : undefined,
  });
}


