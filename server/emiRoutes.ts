import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, databaseDirectory, validateImageMagicBytes } from './db.js';
import {
  getVpFlexibleSettings,
  getAccountFlexibleSettings,
  saveVpFlexibleSettings,
  saveAccountFlexibleSettings,
  calculateAccountPlans,
} from './flexiblePaymentSettings.js';
import {
  generateFlexiblePaymentAgreementHtml,
} from './agreementGenerator.js';

// =============================================================================
// EMI (Equated Monthly Installment) Financing Backend
//
// The emi_applications and emi_payments tables already exist (see server/db.ts).
// Key financial rules:
//   - amountFinanced = totalAmount - initialPayment
//   - Simple interest over tenure:
//       totalPayable = amountFinanced * (1 + (rate/100) * (tenureMonths/12))
//   - emiAmount = round2(totalPayable / tenureMonths)
//   - Due dates are generated monthly from the approval date (addMonths(start, i)).
//   - Installments are NEVER auto-marked paid; only an admin verification marks
//     an installment paid (status 'paid').
// =============================================================================

const uploadsDir = path.join(databaseDirectory, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Adds `months` calendar months to an ISO timestamp while preserving the original
 * time-of-day. If the resulting day overflows the target month (e.g. Jan 31 + 1
 * month), the day is clamped to the last day of the target month.
 */
function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const originalDay = date.getUTCDate();
  const copy = new Date(dateStr);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  // setUTCMonth rolls an overflowing day into the following month; detect that
  // and clamp to the last day of the target month instead.
  if (copy.getUTCDate() !== originalDay) {
    copy.setUTCDate(0);
  }
  return copy.toISOString();
}

/**
 * Adds `weeks` 7-day intervals to an ISO timestamp for weekly installment plans.
 */
function addWeeks(dateStr: string, weeks: number): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  date.setUTCDate(date.getUTCDate() + (weeks * 7));
  return date.toISOString();
}

/**
 * Validates a base64 image data URL and persists it to the public uploads dir.
 * Returns the public URL. Throws 'INVALID_IMAGE' or 'IMAGE_TOO_LARGE' errors
 * that routes translate into 400 responses.
 */
function saveEvidenceImage(dataUrl: string): { url: string; filename: string } {
  if (typeof dataUrl !== 'string') throw new Error('INVALID_IMAGE');
  const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches) throw new Error('INVALID_IMAGE');
  const ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
  const buffer = Buffer.from(matches[2], 'base64');
  // P3-F4: reject evidence images whose bytes don't match the declared format.
  if (!validateImageMagicBytes(buffer, matches[1])) throw new Error('INVALID_IMAGE');
  if (buffer.length > 5 * 1024 * 1024) throw new Error('IMAGE_TOO_LARGE');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filename = `emi_evidence_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return { url: `/uploads/${filename}`, filename };
}

// -----------------------------------------------------------------------------
// Small helpers
// -----------------------------------------------------------------------------

function insertNotification(userId: string, title: string, message: string, now: string): void {
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
    VALUES (?, ?, ?, ?, 'emi', 0, ?)
  `).run('notif_' + crypto.randomBytes(8).toString('hex'), userId, title, message, now);
}

function outstandingBalance(appId: string): number {
  const row = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM emi_payments
    WHERE application_id = ? AND status IN ('pending', 'late', 'pending_verification')
  `).get(appId) as any;
  return round2(Number(row?.total) || 0);
}

function nextUnpaidInstallment(appId: string): any | null {
  const row = db.prepare(`
    SELECT * FROM emi_payments
    WHERE application_id = ? AND status IN ('pending', 'late', 'pending_verification')
    ORDER BY installment_no ASC
    LIMIT 1
  `).get(appId);
  return (row as any) || null;
}

/**
 * Lazily marks overdue installments as 'late' and recomputes the application's
 * next_due_date (earliest unpaid due date). Only meaningful for active plans.
 */
function markOverdue(application: any): void {
  if (!application || application.status !== 'active') return;
  const now = new Date().toISOString();
  const nowMs = Date.now();

  const unpaid = db.prepare(`
    SELECT id, due_date, status
    FROM emi_payments
    WHERE application_id = ? AND status IN ('pending', 'late', 'pending_verification')
  `).all(application.id) as any[];

  for (const row of unpaid) {
    if (
      row.status === 'pending' &&
      row.due_date &&
      new Date(row.due_date).getTime() < nowMs
    ) {
      db.prepare("UPDATE emi_payments SET status = 'late' WHERE id = ?").run(row.id);
    }
  }

  const earliest = db.prepare(`
    SELECT due_date FROM emi_payments
    WHERE application_id = ? AND status IN ('pending', 'late', 'pending_verification')
      AND due_date IS NOT NULL AND due_date != ''
    ORDER BY due_date ASC
    LIMIT 1
  `).get(application.id) as any;
  const nextDue = earliest && earliest.due_date ? earliest.due_date : null;

  db.prepare(`
    UPDATE emi_applications SET next_due_date = ?, updated_at = ? WHERE id = ?
  `).run(nextDue, now, application.id);

  // Keep the in-memory copy in sync so callers serialize the fresh value.
  application.next_due_date = nextDue;
}

/**
 * Serializes a DB row of emi_applications into the public camelCase shape used
 * by customer-facing endpoints.
 */
function serializeApplication(app: any): any {
  let customerDetails: any = null;
  if (app.customer_details_json) {
    try {
      customerDetails = JSON.parse(app.customer_details_json);
    } catch {}
  }

  return {
    id: app.id,
    productTitle: app.product_title,
    totalAmount: app.total_amount,
    initialPayment: app.initial_payment,
    amountFinanced: app.amount_financed,
    tenureMonths: app.tenure_months,
    interestRatePct: app.interest_rate_pct,
    emiAmount: app.emi_amount,
    status: app.status,
    rejectionReason: app.rejection_reason || null,
    nextDueDate: app.next_due_date,
    installmentsPaid: app.installments_paid,
    totalInstallments: app.total_installments,
    outstandingBalance: outstandingBalance(app.id),
    createdAt: app.created_at,
    startDate: app.start_date || null,
    serviceType: app.service_type || 'account',
    region: app.region || null,
    listingId: app.listing_id || null,
    planType: app.plan_type || null,
    paymentFrequency: app.payment_frequency || 'monthly',
    fixedProfit: app.fixed_profit || 0,
    totalPayable: app.total_payable || app.amount_financed || 0,
    agreementRef: app.agreement_ref || null,
    agreementVersion: app.agreement_version || null,
    agreementHtml: app.agreement_html || null,
    customerSignature: app.customer_signature || null,
    signedAt: app.signed_at || null,
    customerDetails,
    kycSubmissionId: app.kyc_submission_id || null,
    adminRemarks: app.admin_remarks || null,
  };
}

const formatInr = (n: number): string =>
  Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const formatDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function registerEmiRoutes(
  app: express.Express,
  helpers: {
    authenticate: any;
    staffOnly: any;
    adminOnly: any;
    superAdminOnly: any;
    sendEmail: (options: { to: string; subject: string; html: string; text?: string }) => Promise<{ success: boolean; logId: string; error?: string }>;
    isEmailConfigured: () => boolean;
    logAudit: (actorId: string, actorName: string, action: string, targetType: string, targetId: string, details: any, ipOrReq: any) => void;
  }
): void {
  const { authenticate, staffOnly, sendEmail, isEmailConfigured, logAudit } = helpers;

  const sendEmiEmailIfConfigured = (userId: string, subject: string, html: string, text?: string): void => {
    if (!isEmailConfigured()) return;
    const userRow = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as any;
    if (!userRow?.email) return;
    sendEmail({ to: userRow.email, subject, html, text: text || subject }).catch((err: any) => {
      console.warn('[EMI Email Warning]:', err?.message || err);
    });
  };

  // ===========================================================================
  // Flexible Payment Settings & Calculation routes
  // ===========================================================================

  // GET /api/emi/settings — customer/public settings
  app.get('/api/emi/settings', (_req: Request, res: Response) => {
    try {
      const vp = getVpFlexibleSettings();
      const account = getAccountFlexibleSettings();
      return res.json({ success: true, vp, account });
    } catch (err: any) {
      console.error('[EMI Settings Error]:', err);
      return res.status(500).json({ error: 'Failed to fetch settings.' });
    }
  });

  // POST /api/emi/calculate — plan calculation engine
  app.post('/api/emi/calculate', (req: Request, res: Response) => {
    try {
      const { serviceType, region, priceINR } = req.body || {};
      if (serviceType === 'vp') {
        const vpSettings = getVpFlexibleSettings();
        const reg = region === 'php' ? 'php' : 'in';
        const packages = vpSettings[reg]?.packages || [];
        return res.json({
          success: true,
          serviceType: 'vp',
          region: reg,
          packages,
          lateFees: { weekly: vpSettings.weeklyLateFee, monthly: vpSettings.monthlyLateFee },
        });
      } else {
        const price = Number(priceINR) || 0;
        const plans = calculateAccountPlans(price);
        const accSettings = getAccountFlexibleSettings();
        return res.json({
          success: true,
          serviceType: 'account',
          priceINR: price,
          plans,
          slabs: accSettings.slabs,
          lateFees: { weekly: accSettings.weeklyLateFee, monthly: accSettings.monthlyLateFee },
        });
      }
    } catch (err: any) {
      console.error('[EMI Calculate Error]:', err);
      return res.status(500).json({ error: 'Failed to calculate payment plans.' });
    }
  });

  // GET /api/admin/emi/settings — staff settings
  app.get('/api/admin/emi/settings', authenticate, staffOnly, (_req: Request, res: Response) => {
    try {
      const vp = getVpFlexibleSettings();
      const account = getAccountFlexibleSettings();
      return res.json({ success: true, vp, account });
    } catch (err: any) {
      console.error('[Admin EMI Settings Error]:', err);
      return res.status(500).json({ error: 'Failed to fetch settings.' });
    }
  });

  // PUT /api/admin/emi/settings — update VP or Account settings
  app.put('/api/admin/emi/settings', authenticate, staffOnly, (req: Request, res: Response) => {
    try {
      const { category, settings } = req.body || {};
      const staff = (req as any).user;
      if (category !== 'vp' && category !== 'account') {
        return res.status(400).json({ error: 'category must be "vp" or "account".' });
      }
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'settings object is required.' });
      }

      if (category === 'vp') {
        saveVpFlexibleSettings(settings, staff.id);
      } else {
        saveAccountFlexibleSettings(settings, staff.id);
      }

      logAudit(staff.id, staff.name, 'EMI_SETTINGS_UPDATE', 'emi_settings', category, { category }, req);
      return res.json({ success: true, message: `${category.toUpperCase()} flexible payment settings updated successfully.` });
    } catch (err: any) {
      console.error('[Admin EMI Settings Update Error]:', err);
      return res.status(500).json({ error: 'Failed to update settings.' });
    }
  });

  // ===========================================================================
  // Customer routes
  // ===========================================================================

  // POST /api/emi/apply — submit a flexible payment / EMI financing application
  app.post('/api/emi/apply', authenticate, (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const productTitle = typeof body.productTitle === 'string' ? body.productTitle.trim() : '';
      const totalAmount = Number(body.totalAmount);
      const initialPayment = body.initialPayment === undefined || body.initialPayment === null ? 0 : Number(body.initialPayment);
      const tenureMonths = Number(body.tenureMonths || body.installmentsCount);
      let ratePct = body.interestRatePct === undefined || body.interestRatePct === null ? 0 : Number(body.interestRatePct);
      if (!Number.isFinite(ratePct)) ratePct = 0;
      ratePct = Math.min(36, Math.max(0, ratePct));
      const orderId = typeof body.orderId === 'string' && body.orderId.trim() ? body.orderId.trim() : null;

      if (!productTitle) {
        return res.status(400).json({ error: 'Product title is required.' });
      }
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        return res.status(400).json({ error: 'Total amount must be greater than 0.' });
      }
      if (!Number.isFinite(initialPayment) || initialPayment < 0 || initialPayment >= totalAmount) {
        return res.status(400).json({ error: 'Initial payment must be at least 0 and less than the total amount.' });
      }
      if (!Number.isInteger(tenureMonths) || tenureMonths < 1 || tenureMonths > 36) {
        return res.status(400).json({ error: 'Tenure months must be a whole number between 1 and 36.' });
      }

      const amountFinanced = round2(totalAmount - initialPayment);

      // Flexible Plan Rich Fields
      const serviceType = body.serviceType === 'vp' ? 'vp' : 'account';
      const region = body.region === 'php' ? 'php' : (body.region === 'in' ? 'in' : null);
      const listingId = typeof body.listingId === 'string' && body.listingId.trim() ? body.listingId.trim() : null;
      const planType = typeof body.planType === 'string' ? body.planType.trim() : null;
      const paymentFrequency = body.paymentFrequency === 'weekly' ? 'weekly' : 'monthly';
      const fixedProfit = Number(body.fixedProfit) || 0;
      let totalPayable = Number(body.totalPayable);
      if (!Number.isFinite(totalPayable) || totalPayable <= 0) {
        totalPayable = fixedProfit > 0
          ? round2(amountFinanced + fixedProfit)
          : round2(amountFinanced * (1 + (ratePct / 100) * (tenureMonths / 12)));
      }
      let emiAmount = Number(body.emiAmount);
      if (!Number.isFinite(emiAmount) || emiAmount <= 0) {
        emiAmount = round2(totalPayable / tenureMonths);
      }

      const agreementRef = typeof body.agreementRef === 'string' && body.agreementRef.trim()
        ? body.agreementRef.trim()
        : `VIB-FPP-2026-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const agreementVersion = typeof body.agreementVersion === 'string' ? body.agreementVersion : '2026.1';
      const customerSignature = typeof body.customerSignature === 'string' ? body.customerSignature : null;
      const customerDetails = body.customerDetails && typeof body.customerDetails === 'object' ? body.customerDetails : null;
      const kycSubmissionId = typeof body.kycSubmissionId === 'string' ? body.kycSubmissionId : null;
      const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

      const id = 'emi_' + crypto.randomBytes(6).toString('hex');
      const now = new Date().toISOString();
      const userId = (req as any).user.id;

      // Generate full agreement HTML
      const scheduleItems = [];
      const isWeekly = paymentFrequency === 'weekly';
      for (let i = 1; i <= tenureMonths; i++) {
        const dueDate = isWeekly ? addWeeks(now, i) : addMonths(now, i);
        const formattedDate = new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        scheduleItems.push({
          installmentNo: i,
          dueDate: formattedDate,
          amount: i === tenureMonths ? round2(totalPayable - emiAmount * (tenureMonths - 1)) : emiAmount,
        });
      }

      const agreementHtml = generateFlexiblePaymentAgreementHtml({
        agreementRef,
        orderId: orderId || undefined,
        version: agreementVersion,
        dateStr: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        customer: {
          fullName: customerDetails?.fullName || (req as any).user.name || 'Verified Customer',
          dob: customerDetails?.dob,
          phone: customerDetails?.phone || (req as any).user.phone,
          email: customerDetails?.email || (req as any).user.email,
          address: customerDetails?.address,
          city: customerDetails?.city,
          state: customerDetails?.state,
          country: customerDetails?.country || 'India',
          guardianName: customerDetails?.guardianName,
          guardianRelation: customerDetails?.guardianRelation,
        },
        service: {
          serviceType,
          title: productTitle,
          region: region || undefined,
          listingId: listingId || undefined,
        },
        financials: {
          serviceCost: totalAmount,
          downPayment: initialPayment,
          downPaymentPct: initialPayment > 0 ? Math.round((initialPayment / totalAmount) * 100) : undefined,
          principalBalance: amountFinanced,
          fixedProfit,
          totalPayable,
          installmentAmount: emiAmount,
          installmentsCount: tenureMonths,
          paymentFrequency,
          weeklyLateFee: 300,
          monthlyLateFee: 1500,
        },
        schedule: scheduleItems,
        signatureDataUrl: customerSignature || undefined,
        ipAddress: String(clientIp),
      });

      db.prepare(`
        INSERT INTO emi_applications (
          id, user_id, order_id, product_title, total_amount, initial_payment,
          amount_financed, tenure_months, interest_rate_pct, emi_amount,
          total_installments, installments_paid, status, rejection_reason,
          start_date, next_due_date, created_at, updated_at, reviewed_at, reviewed_by,
          service_type, region, listing_id, plan_type, payment_frequency,
          fixed_profit, total_payable, agreement_ref, agreement_version, agreement_html,
          customer_signature, signed_at, ip_address, customer_details_json, kyc_submission_id
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 0, 'pending_approval', NULL,
          NULL, NULL, ?, ?, NULL, NULL,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `).run(
        id,
        userId,
        orderId,
        productTitle,
        totalAmount,
        initialPayment,
        amountFinanced,
        tenureMonths,
        ratePct,
        emiAmount,
        tenureMonths,
        now,
        now,
        serviceType,
        region,
        listingId,
        planType,
        paymentFrequency,
        fixedProfit,
        totalPayable,
        agreementRef,
        agreementVersion,
        agreementHtml,
        customerSignature,
        now,
        String(clientIp),
        customerDetails ? JSON.stringify(customerDetails) : null,
        kycSubmissionId
      );

      insertNotification(
        userId,
        'Flexible Payment Application Received',
        `Your application for ${productTitle} (${agreementRef}) has been received and is pending staff review.`,
        now
      );

      // Notify administrator email
      if (isEmailConfigured()) {
        sendEmail({
          to: 'thevibofficial@gmail.com',
          subject: `[VIB] New Flexible Payment Application: ${productTitle} (${agreementRef})`,
          html: `<p>A new flexible payment plan application has been submitted.</p>
                 <p><strong>Customer:</strong> ${escapeHtml(customerDetails?.fullName || (req as any).user.name || 'Customer')} (${escapeHtml((req as any).user.email)})</p>
                 <p><strong>Service:</strong> ${escapeHtml(productTitle)}</p>
                 <p><strong>Total Cost:</strong> ₹${formatInr(totalAmount)} | <strong>Down Payment:</strong> ₹${formatInr(initialPayment)}</p>
                 <p><strong>Total Payable:</strong> ₹${formatInr(totalPayable)} | <strong>Installments:</strong> ${tenureMonths} (${paymentFrequency}) of ₹${formatInr(emiAmount)}</p>
                 <p><strong>Agreement Ref:</strong> ${escapeHtml(agreementRef)}</p>`,
        }).catch(() => {});
      }

      return res.status(201).json({
        success: true,
        application: {
          id,
          status: 'pending_approval',
          amountFinanced,
          emiAmount,
          totalInstallments: tenureMonths,
          agreementRef,
          totalPayable,
          paymentFrequency,
        },
      });
    } catch (err: any) {
      console.error('[EMI Apply Error]:', err);
      return res.status(500).json({ error: 'Failed to submit EMI application.' });
    }
  });

  // GET /api/user/emi — list the current user's EMI applications
  app.get('/api/user/emi', authenticate, (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const rows = db.prepare(`
        SELECT * FROM emi_applications WHERE user_id = ? ORDER BY created_at DESC
      `).all(userId) as any[];

      // Lazily mark overdue installments on active plans before responding.
      for (const row of rows) {
        if (row.status === 'active') markOverdue(row);
      }

      const applications = rows.map((row) => serializeApplication(row));

      return res.json({ applications });
    } catch (err: any) {
      console.error('[EMI User List Error]:', err);
      return res.status(500).json({ error: 'Failed to fetch EMI applications.' });
    }
  });

  // GET /api/user/emi/:id — owner-only detail with installment schedule
  app.get('/api/user/emi/:id', authenticate, (req: Request, res: Response) => {
    try {
      const appId = req.params.id;
      const userId = (req as any).user.id;
      const application = db.prepare('SELECT * FROM emi_applications WHERE id = ?').get(appId) as any;
      if (!application) {
        return res.status(404).json({ error: 'EMI application not found.' });
      }
      if (application.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      if (application.status === 'active') markOverdue(application);

      const payments = (db.prepare(`
        SELECT id, installment_no, amount, due_date, status, paid_at, utr, payment_method, evidence_image
        FROM emi_payments
        WHERE application_id = ?
        ORDER BY installment_no ASC
      `).all(appId) as any[]).map((p) => ({
        id: p.id,
        installmentNo: p.installment_no,
        amount: p.amount,
        dueDate: p.due_date,
        status: p.status,
        paidAt: p.paid_at,
        utr: p.utr,
        paymentMethod: p.payment_method,
        evidenceImage: p.evidence_image,
      }));

      return res.json({ application: serializeApplication(application), payments });
    } catch (err: any) {
      console.error('[EMI User Detail Error]:', err);
      return res.status(500).json({ error: 'Failed to fetch EMI application details.' });
    }
  });

  // POST /api/emi/:id/pay-installment — submit UPI evidence for the next installment
  app.post('/api/emi/:id/pay-installment', authenticate, (req: Request, res: Response) => {
    try {
      const appId = req.params.id;
      const { installmentId, utr, evidenceImage } = req.body || {};
      const userId = (req as any).user.id;

      const application = db.prepare('SELECT * FROM emi_applications WHERE id = ?').get(appId) as any;
      if (!application) {
        return res.status(404).json({ error: 'EMI application not found.' });
      }
      if (application.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      if (application.status !== 'active') {
        return res.status(409).json({ error: 'EMI application is not active.' });
      }
      if (typeof installmentId !== 'string' || !installmentId.trim()) {
        return res.status(400).json({ error: 'installmentId is required.' });
      }
      const utrValue = typeof utr === 'string' ? utr.trim() : '';
      if (!utrValue) {
        return res.status(400).json({ error: 'UTR reference is required.' });
      }

      const payment = db.prepare('SELECT * FROM emi_payments WHERE id = ? AND application_id = ?').get(installmentId, appId) as any;
      if (!payment) {
        return res.status(404).json({ error: 'Installment not found for this application.' });
      }

      // Installments must be paid in order.
      const nextUnpaid = nextUnpaidInstallment(appId);
      if (!nextUnpaid || nextUnpaid.installment_no !== payment.installment_no) {
        return res.status(409).json({ error: 'Please pay installments in order.' });
      }
      if (payment.status === 'pending_verification') {
        return res.status(409).json({ error: 'This installment already has a payment awaiting verification.' });
      }
      if (payment.status === 'paid') {
        return res.status(409).json({ error: 'This installment has already been paid.' });
      }

      let evidenceUrl: string;
      try {
        evidenceUrl = saveEvidenceImage(evidenceImage).url;
      } catch (imgErr: any) {
        if (imgErr.message === 'INVALID_IMAGE') {
          return res.status(400).json({ error: 'Invalid image format. Expected a base64 data URL.' });
        }
        if (imgErr.message === 'IMAGE_TOO_LARGE') {
          return res.status(400).json({ error: 'Image exceeds maximum 5MB file size limit.' });
        }
        throw imgErr;
      }

      const now = new Date().toISOString();

      // Remove the previously submitted evidence file (if any) so the disk does
      // not accumulate orphaned files on rejection -> resubmission cycles.
      if (payment.evidence_image) {
        try {
          const oldPath = path.join(databaseDirectory, 'uploads', path.basename(payment.evidence_image));
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch { /* best-effort cleanup */ }
      }

      db.prepare(`
        UPDATE emi_payments
        SET status = 'pending_verification', utr = ?, evidence_image = ?, payment_method = 'UPI_QR'
        WHERE id = ?
      `).run(utrValue, evidenceUrl, payment.id);

      insertNotification(
        userId,
        'EMI Payment Submitted',
        `Your installment #${payment.installment_no} payment of ₹${formatInr(payment.amount)} has been submitted for verification.`,
        now
      );

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[EMI Pay Installment Error]:', err);
      return res.status(500).json({ error: 'Failed to submit installment payment.' });
    }
  });

  // ===========================================================================
  // Staff routes
  // ===========================================================================

  // GET /api/admin/emi/list — staff queue with user context
  app.get('/api/admin/emi/list', authenticate, staffOnly, (req: Request, res: Response) => {
    try {
      const statusFilter = typeof req.query.status === 'string' && req.query.status.trim() ? req.query.status.trim() : null;
      let sql = `
        SELECT e.*, u.email AS user_email, u.name AS user_name, u.phone AS user_phone
        FROM emi_applications e
        JOIN users u ON e.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (statusFilter) {
        sql += ' AND e.status = ?';
        params.push(statusFilter);
      }
      sql += ' ORDER BY e.created_at DESC';

      const rows = db.prepare(sql).all(...params) as any[];
      const applications = rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        user_email: r.user_email,
        user_name: r.user_name,
        user_phone: r.user_phone,
        product_title: r.product_title,
        total_amount: r.total_amount,
        initial_payment: r.initial_payment,
        amount_financed: r.amount_financed,
        tenure_months: r.tenure_months,
        interest_rate_pct: r.interest_rate_pct,
        emi_amount: r.emi_amount,
        total_installments: r.total_installments,
        installments_paid: r.installments_paid,
        status: r.status,
        rejection_reason: r.rejection_reason,
        created_at: r.created_at,
        start_date: r.start_date,
        next_due_date: r.next_due_date,
        outstanding: outstandingBalance(r.id),
        service_type: r.service_type || 'account',
        region: r.region || null,
        listing_id: r.listing_id || null,
        plan_type: r.plan_type || null,
        payment_frequency: r.payment_frequency || 'monthly',
        fixed_profit: r.fixed_profit || 0,
        total_payable: r.total_payable || r.amount_financed || 0,
        agreement_ref: r.agreement_ref || null,
        agreement_version: r.agreement_version || null,
        customer_details_json: r.customer_details_json || null,
        kyc_submission_id: r.kyc_submission_id || null,
        admin_remarks: r.admin_remarks || null,
      }));

      return res.json({ applications });
    } catch (err: any) {
      console.error('[Admin EMI List Error]:', err);
      return res.status(500).json({ error: 'Failed to fetch EMI applications.' });
    }
  });

  // GET /api/admin/emi/:id — full staff detail including payment evidence
  app.get('/api/admin/emi/:id', authenticate, staffOnly, (req: Request, res: Response) => {
    try {
      const appId = req.params.id;
      const application = db.prepare(`
        SELECT e.*, u.email AS user_email, u.name AS user_name, u.phone AS user_phone
        FROM emi_applications e
        JOIN users u ON e.user_id = u.id
        WHERE e.id = ?
      `).get(appId);

      if (!application) {
        return res.status(404).json({ error: 'EMI application not found.' });
      }

      const payments = db.prepare(`
        SELECT * FROM emi_payments
        WHERE application_id = ?
        ORDER BY installment_no ASC
      `).all(appId);

      return res.json({ success: true, application, payments });
    } catch (err: any) {
      console.error('[Admin EMI Detail Error]:', err);
      return res.status(500).json({ error: 'Failed to fetch EMI application details.' });
    }
  });

  // PUT /api/admin/emi/:id/status — approve / reject / cancel an application
  app.put('/api/admin/emi/:id/status', authenticate, staffOnly, (req: Request, res: Response) => {
    try {
      const appId = req.params.id;
      const { status, reason } = req.body || {};
      const staff = (req as any).user;

      if (status !== 'active' && status !== 'rejected' && status !== 'cancelled') {
        return res.status(400).json({ error: 'Status must be one of: active, rejected, cancelled.' });
      }

      const application = db.prepare('SELECT * FROM emi_applications WHERE id = ?').get(appId) as any;
      if (!application) {
        return res.status(404).json({ error: 'EMI application not found.' });
      }

      const now = new Date().toISOString();

      // ---- Approve ---------------------------------------------------------
      if (status === 'active') {
        if (application.status !== 'pending_approval') {
          return res.status(409).json({ error: 'Only pending EMI applications can be approved.' });
        }

        const isWeekly = application.payment_frequency === 'weekly';
        const startDate = now;
        const firstDue = isWeekly ? addWeeks(startDate, 1) : addMonths(startDate, 1);
        const totalInstallments = application.total_installments;
        const emiAmount = application.emi_amount;
        // Reconciled schedule: the final installment absorbs any rounding drift so
        // the sum of all installments exactly equals the total payable amount.
        const totalPayable = application.total_payable && application.total_payable > 0
          ? round2(application.total_payable)
          : round2(
              application.amount_financed * (1 + (application.interest_rate_pct / 100) * (application.tenure_months / 12))
            );
        const lastInstallmentAmount = round2(totalPayable - emiAmount * (totalInstallments - 1));

        try {
          db.exec('BEGIN IMMEDIATE');

          db.prepare(`
            UPDATE emi_applications
            SET status = 'active', start_date = ?, next_due_date = ?, reviewed_at = ?, reviewed_by = ?, updated_at = ?
            WHERE id = ?
          `).run(startDate, firstDue, now, staff.id, now, appId);

          // Create the installment schedule on approval (the schema requires a
          // non-null due_date, so rows are materialized here rather than at
          // application time).
          const insertPay = db.prepare(`
            INSERT INTO emi_payments (id, application_id, installment_no, amount, due_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?)
          `);
          for (let i = 1; i <= totalInstallments; i++) {
            const installmentAmount = i === totalInstallments ? lastInstallmentAmount : emiAmount;
            const dueDate = isWeekly ? addWeeks(startDate, i) : addMonths(startDate, i);
            insertPay.run(
              'emi_pay_' + crypto.randomBytes(6).toString('hex'),
              appId,
              i,
              installmentAmount,
              dueDate,
              now
            );
          }

          db.exec('COMMIT');
        } catch (txErr) {
          try { db.exec('ROLLBACK'); } catch {}
          throw txErr;
        }

        insertNotification(
          application.user_id,
          'EMI Approved',
          `Your EMI plan for ${application.product_title} is approved. First installment due ${formatDate(firstDue)}.`,
          now
        );

        sendEmiEmailIfConfigured(
          application.user_id,
          'EMI Application Approved',
          `<p>Hello,</p><p>Your EMI plan for <strong>${escapeHtml(application.product_title)}</strong> is approved.</p><p>First installment of ₹${formatInr(emiAmount)} is due on <strong>${formatDate(firstDue)}</strong>.</p>`,
          `Your EMI plan for ${application.product_title} is approved. First installment of ₹${formatInr(emiAmount)} is due on ${formatDate(firstDue)}.`
        );

        logAudit(staff.id, staff.name, 'EMI_APPROVE', 'emi_application', appId, {
          productTitle: application.product_title,
          tenureMonths: totalInstallments,
          emiAmount,
          firstDue,
        }, req);

        return res.json({ success: true, message: 'EMI application approved.', nextDueDate: firstDue });
      }

      // ---- Reject ----------------------------------------------------------
      if (status === 'rejected') {
        if (application.status === 'active') {
          return res.status(409).json({ error: 'Active EMI applications cannot be rejected; cancel them instead.' });
        }
        if (application.status !== 'pending_approval') {
          return res.status(409).json({ error: `Cannot reject an application in '${application.status}' status.` });
        }

        const rejectReason = typeof reason === 'string' ? reason.trim() : '';
        if (rejectReason.length < 5) {
          return res.status(400).json({ error: 'A rejection reason of at least 5 characters is required.' });
        }

        db.prepare(`
          UPDATE emi_applications
          SET status = 'rejected', rejection_reason = ?, reviewed_at = ?, reviewed_by = ?, updated_at = ?
          WHERE id = ?
        `).run(rejectReason, now, staff.id, now, appId);

        insertNotification(
          application.user_id,
          'EMI Rejected',
          `Your EMI application for ${application.product_title} was rejected. Reason: ${rejectReason}`,
          now
        );

        sendEmiEmailIfConfigured(
          application.user_id,
          'EMI Application Rejected',
          `<p>Hello,</p><p>Your EMI application for <strong>${escapeHtml(application.product_title)}</strong> was not approved.</p><p>Reason: ${escapeHtml(rejectReason)}</p>`,
          `Your EMI application for ${application.product_title} was rejected. Reason: ${rejectReason}`
        );

        logAudit(staff.id, staff.name, 'EMI_REJECT', 'emi_application', appId, {
          productTitle: application.product_title,
          reason: rejectReason,
        }, req);

        return res.json({ success: true, message: 'EMI application rejected.' });
      }

      // ---- Cancel ----------------------------------------------------------
      if (application.status !== 'active') {
        return res.status(409).json({ error: 'Only active EMI applications can be cancelled.' });
      }

      db.prepare(`
        UPDATE emi_applications
        SET status = 'cancelled', reviewed_at = ?, reviewed_by = ?, updated_at = ?
        WHERE id = ?
      `).run(now, staff.id, now, appId);

      insertNotification(
        application.user_id,
        'EMI Cancelled',
        `Your EMI plan for ${application.product_title} has been cancelled.`,
        now
      );

      logAudit(staff.id, staff.name, 'EMI_CANCEL', 'emi_application', appId, {
        productTitle: application.product_title,
      }, req);

      return res.json({ success: true, message: 'EMI application cancelled.' });
    } catch (err: any) {
      console.error('[Admin EMI Status Error]:', err);
      return res.status(500).json({ error: 'Failed to update EMI application status.' });
    }
  });

  // PUT /api/admin/emi/payments/:paymentId/verify — verify or reject installment proof
  app.put('/api/admin/emi/payments/:paymentId/verify', authenticate, staffOnly, (req: Request, res: Response) => {
    try {
      const paymentId = req.params.paymentId;
      const { approved, reason } = req.body || {};
      const staff = (req as any).user;

      if (typeof approved !== 'boolean') {
        return res.status(400).json({ error: 'approved must be a boolean.' });
      }

      const payment = db.prepare('SELECT * FROM emi_payments WHERE id = ?').get(paymentId) as any;
      if (!payment) {
        return res.status(404).json({ error: 'EMI installment payment not found.' });
      }
      if (payment.status !== 'pending_verification') {
        return res.status(409).json({ error: 'Only installments awaiting verification can be verified.' });
      }

      const application = db.prepare('SELECT * FROM emi_applications WHERE id = ?').get(payment.application_id) as any;
      if (!application) {
        return res.status(404).json({ error: 'EMI application not found.' });
      }
      if (application.status !== 'active') {
        return res.status(409).json({ error: 'EMI application is not active.' });
      }

      const now = new Date().toISOString();

      // ---- Approved --------------------------------------------------------
      if (approved) {
        db.prepare(`
          UPDATE emi_payments
          SET status = 'paid', paid_at = ?, verified_by = ?, verified_at = ?
          WHERE id = ?
        `).run(now, staff.id, now, paymentId);

        const newPaidCount = (application.installments_paid || 0) + 1;
        const nextUnpaid = nextUnpaidInstallment(application.id);
        const isCompleted = !nextUnpaid;
        const nextDue = nextUnpaid && nextUnpaid.due_date ? nextUnpaid.due_date : null;

        db.prepare(`
          UPDATE emi_applications
          SET installments_paid = ?, status = ?, next_due_date = ?, updated_at = ?
          WHERE id = ?
        `).run(newPaidCount, isCompleted ? 'completed' : 'active', nextDue, now, application.id);

        if (isCompleted) {
          insertNotification(
            application.user_id,
            'EMI Completed',
            `You have completed all EMI installments for ${application.product_title}.`,
            now
          );
          sendEmiEmailIfConfigured(
            application.user_id,
            'EMI Completed',
            `<p>Hello,</p><p>Congratulations! You have completed all EMI installments for <strong>${escapeHtml(application.product_title)}</strong>.</p>`,
            `You have completed all EMI installments for ${application.product_title}.`
          );
        } else {
          insertNotification(
            application.user_id,
            'EMI Installment Verified',
            `Installment #${payment.installment_no} of ₹${formatInr(payment.amount)} has been verified.`,
            now
          );
          sendEmiEmailIfConfigured(
            application.user_id,
            'EMI Installment Verified',
            `<p>Installment #${payment.installment_no} of ₹${formatInr(payment.amount)} has been verified.</p>`,
            `Installment #${payment.installment_no} of ₹${formatInr(payment.amount)} has been verified.`
          );
        }

        logAudit(staff.id, staff.name, 'EMI_PAYMENT_VERIFY', 'emi_payment', paymentId, {
          applicationId: application.id,
          installmentNo: payment.installment_no,
          amount: payment.amount,
          completed: isCompleted,
        }, req);

        return res.json({
          success: true,
          message: isCompleted ? 'All EMI installments completed.' : 'Installment verified.',
        });
      }

      // ---- Rejected --------------------------------------------------------
      const rejectReason = typeof reason === 'string' && reason.trim() ? reason.trim() : 'Payment evidence could not be verified.';

      // Return the installment to 'pending' so the customer can resubmit.
      // UTR and evidence are retained for history; a resubmission overwrites them.
      db.prepare(`
        UPDATE emi_payments
        SET status = 'pending', verified_by = ?, verified_at = ?
        WHERE id = ?
      `).run(staff.id, now, paymentId);

      insertNotification(
        application.user_id,
        'EMI Installment Rejected',
        `Your installment #${payment.installment_no} payment of ₹${formatInr(payment.amount)} was not approved${typeof reason === 'string' && reason.trim() ? `: ${reason.trim()}` : '.'}`,
        now
      );

      sendEmiEmailIfConfigured(
        application.user_id,
        'EMI Installment Rejected',
        `<p>Your installment #${payment.installment_no} payment of ₹${formatInr(payment.amount)} was not approved${typeof reason === 'string' && reason.trim() ? `: ${escapeHtml(reason.trim())}` : '.'}</p>`,
        `Your installment #${payment.installment_no} payment of ₹${formatInr(payment.amount)} was not approved${typeof reason === 'string' && reason.trim() ? `: ${reason.trim()}` : '.'}`
      );

      logAudit(staff.id, staff.name, 'EMI_PAYMENT_REJECT', 'emi_payment', paymentId, {
        applicationId: application.id,
        installmentNo: payment.installment_no,
        reason: rejectReason,
      }, req);

      return res.json({ success: true, message: 'Installment payment returned to pending for resubmission.' });
    } catch (err: any) {
      console.error('[Admin EMI Payment Verify Error]:', err);
      return res.status(500).json({ error: 'Failed to verify EMI installment payment.' });
    }
  });
}
