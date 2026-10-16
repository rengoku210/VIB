import nodemailer, { Transporter } from 'nodemailer';
import { db } from './db';
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

  if (transport) {
    try {
      await transport.sendMail({
        from: `"${PLATFORM_NAME}" <${SENDER_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.subject,
      });
      status = 'delivered';
      console.log(`[Email Service] Email sent successfully to ${options.to} (${options.subject})`);
    } catch (err: any) {
      status = 'failed';
      errorMessage = err.message || String(err);
      console.error(`[Email Service] Failed to deliver email to ${options.to}:`, err);
    }
  } else {
    // Graceful Diagnostic Mode (when SMTP credentials not yet provided in .env)
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

  await sendEmail({
    to: details.email || order.user_email || 'customer@vib.gg',
    subject: `Order Received & Awaiting Verification: #${order.id}`,
    html: customerHtml,
    templateName: 'order_pending_verification',
    context: { orderId: order.id, amount: order.amount, title: order.title, riotId },
  });

  // 2. Notification to Administrator (thevibofficial@gmail.com)
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #1e1b2e; color: #ffffff; padding: 20px; border-radius: 8px;">
      <h2 style="color: #f59e0b;">ACTION REQUIRED: New Order #${order.id}</h2>
      <p>A customer has placed an order and submitted payment verification evidence.</p>
      
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

  await sendEmail({
    to: details.email || order.user_email || 'customer@vib.gg',
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

  await sendEmail({
    to: details.email || order.user_email || 'customer@vib.gg',
    subject: `Payment Verification Update for Order #${order.id}`,
    html,
    templateName: 'payment_rejected',
    context: { orderId: order.id, reason, title: order.title },
  });
}
