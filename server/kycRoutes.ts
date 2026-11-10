/**
 * KYC Verification Backend Routes
 *
 * User-facing KYC submission + private document access endpoints, and
 * staff-side review workflows. Documents are stored privately on disk under
 * <databaseDirectory>/kyc_docs and are NEVER mounted statically or exposed as
 * public URLs — only the generated filename is persisted in
 * kyc_submissions.documents_json. All file downloads go through authenticated
 * routes that serve from the private directory directly.
 */
import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, databaseDirectory, validateImageMagicBytes } from './db.js';

const KYC_DOCS_DIR = path.join(databaseDirectory, 'kyc_docs');
const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5MB per file

// Same data-URL shape as the existing upload endpoint, extended with PDF.
const DATA_URL_RE = /^data:(image\/(?:jpeg|jpg|png|webp|gif)|application\/pdf);base64,(.+)$/i;

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface DocumentDecodeResult {
  ok: boolean;
  error?: string;
  buffer?: Buffer;
  ext?: string;
}

function decodeDocumentDataUrl(dataUrl: string): DocumentDecodeResult {
  const match = String(dataUrl || '').match(DATA_URL_RE);
  if (!match) {
    return { ok: false, error: 'Invalid document format. Expected a base64 image/PDF data URL.' };
  }
  const mime = match[1].toLowerCase();
  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    return { ok: false, error: 'Unsupported document file type. Allowed: jpeg, png, webp, gif, pdf.' };
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) {
    return { ok: false, error: 'Document data is empty.' };
  }
  if (buffer.length > MAX_DOC_BYTES) {
    return { ok: false, error: 'Document exceeds the maximum 5MB file size limit.' };
  }
  // P3-F4: reject documents whose bytes don't match the declared MIME type.
  if (!validateImageMagicBytes(buffer, mime)) {
    return { ok: false, error: 'File content does not match declared format.' };
  }
  return { ok: true, buffer, ext };
}

/**
 * Validate a base64 data URL and write the decoded bytes into the private
 * kyc_docs directory. Returns the generated filename on success.
 */
function saveDocumentDataUrl(dataUrl: string): { ok: boolean; filename?: string; error?: string } {
  const decoded = decodeDocumentDataUrl(dataUrl);
  if (!decoded.ok) {
    return { ok: false, error: decoded.error };
  }
  const filename = `kycdoc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${decoded.ext}`;
  fs.writeFileSync(path.join(KYC_DOCS_DIR, filename), decoded.buffer as Buffer);
  return { ok: true, filename };
}

function parseDocumentsJson(json: string | null | undefined): Array<{ label: string; filename: string }> {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: any): item is { label: string; filename: string } =>
        !!item && typeof item.filename === 'string'
    );
  } catch {
    return [];
  }
}

function latestSubmissionForUser(userId: string): any {
  return db.prepare(`
    SELECT * FROM kyc_submissions
    WHERE user_id = ?
    ORDER BY submitted_at DESC
    LIMIT 1
  `).get(userId);
}

/** Ensure a profile row exists and keep its KYC status in sync. */
function upsertProfileKycStatus(userId: string, status: string, now: string): void {
  db.prepare(`
    INSERT INTO profiles (user_id, wallet_balance, kyc_status, total_orders, created_at)
    VALUES (?, 0, ?, 0, ?)
    ON CONFLICT(user_id) DO UPDATE SET kyc_status = excluded.kyc_status
  `).run(userId, status, now);
}

function insertNotification(userId: string, title: string, message: string, now: string): void {
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
    VALUES (?, ?, ?, ?, 'kyc', 0, ?)
  `).run('notif_' + crypto.randomBytes(8).toString('hex'), userId, title, message, now);
}

function buildKycEmailHtml(title: string, message: string): string {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #0b0a13; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #a855f7; border-bottom: 2px solid #581c87; padding-bottom: 8px;">VIB DIGITAL SERVICES</h2>
      <h3 style="color: #ffffff;">${escapeHtml(title)}</h3>
      <p style="color: #e2e8f0; line-height: 1.6;">${escapeHtml(message)}</p>
      <hr style="border: 0; border-top: 1px solid #33294d; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">VIB Official Security Desk | Support WhatsApp: +91 80996 41606</p>
    </div>
  `;
}

export function registerKycRoutes(
  app: express.Express,
  helpers: {
    authenticate: any;      // middleware from index.ts
    staffOnly: any;         // middleware for admin/superadmin/moderator
    adminOnly: any;
    superAdminOnly: any;
    sendEmail: (options: { to: string; subject: string; html: string; text?: string }) => Promise<{ success: boolean; logId: string; error?: string }>;
    isEmailConfigured: () => boolean;
    logAudit: (actorId: string, actorName: string, action: string, targetType: string, targetId: string, details: any, ipOrReq: any) => void;
  }
): void {
  const { authenticate, staffOnly, isEmailConfigured, sendEmail, logAudit } = helpers;

  // =========================================================================
  // POST /api/kyc/submit — user submits a new KYC application
  // =========================================================================
  app.post('/api/kyc/submit', authenticate, (req: Request, res: Response): void => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const { fullName, dob, address, idType, idNumber, documents } = req.body || {};
      const name = String(fullName || '').trim();
      const idTypeStr = String(idType || '').trim();
      const idNumberStr = String(idNumber || '').trim();
      const dobStr = dob ? String(dob).trim() : '';
      const addressStr = address ? String(address).trim() : '';

      if (name.length < 2) {
        res.status(400).json({ error: 'Full name is required (at least 2 characters).' });
        return;
      }
      if (!idTypeStr) {
        res.status(400).json({ error: 'ID type is required.' });
        return;
      }
      if (!idNumberStr) {
        res.status(400).json({ error: 'ID number is required.' });
        return;
      }
      if (!Array.isArray(documents) || documents.length < 1 || documents.length > 4) {
        res.status(400).json({ error: 'Please provide between 1 and 4 document uploads.' });
        return;
      }

      // A user may only have one submission in flight at a time.
      const pending = db.prepare(`
        SELECT id FROM kyc_submissions
        WHERE user_id = ? AND status = 'pending'
        ORDER BY submitted_at DESC
        LIMIT 1
      `).get(user.id) as any;
      if (pending) {
        res.status(409).json({ error: 'A KYC verification is already pending review.' });
        return;
      }

      const profile = db.prepare('SELECT kyc_status FROM profiles WHERE user_id = ?').get(user.id) as any;
      if (profile?.kyc_status === 'approved') {
        res.status(409).json({ error: 'Your identity is already verified.' });
        return;
      }

      // Validate every document before writing anything to disk.
      const validatedDocs: Array<{ label: string; dataUrl: string }> = [];
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const label = doc && typeof doc.label === 'string' ? doc.label.trim() : '';
        if (!label) {
          res.status(400).json({ error: `Document ${i + 1} is missing a label.` });
          return;
        }
        const dataUrl = String(doc.dataUrl || '');
        const decoded = decodeDocumentDataUrl(dataUrl);
        if (!decoded.ok) {
          res.status(400).json({ error: `Document ${i + 1}: ${decoded.error}` });
          return;
        }
        validatedDocs.push({ label, dataUrl });
      }

      // Persist files privately. Clean up partial writes on any failure.
      const savedFilenames: string[] = [];
      try {
        fs.mkdirSync(KYC_DOCS_DIR, { recursive: true });
        for (const doc of validatedDocs) {
          const result = saveDocumentDataUrl(doc.dataUrl);
          if (!result.ok) {
            // Should never happen after validation, but guard anyway.
            throw new Error(result.error || 'Failed to store document');
          }
          savedFilenames.push(result.filename as string);
        }
      } catch (err) {
        for (const f of savedFilenames) {
          try { fs.unlinkSync(path.join(KYC_DOCS_DIR, f)); } catch { /* ignore */ }
        }
        console.error('[KYC Submit] Failed to store documents:', err);
        res.status(500).json({ error: 'Failed to save KYC documents.' });
        return;
      }

      const submissionId = 'kyc_' + crypto.randomBytes(6).toString('hex');
      const now = new Date().toISOString();
      const documentsJson = JSON.stringify(
        validatedDocs.map((doc, i) => ({ label: doc.label, filename: savedFilenames[i] }))
      );

      try {
        db.prepare(`
          INSERT INTO kyc_submissions (
            id, user_id, full_name, dob, address, id_type, id_number, documents_json,
            status, rejection_reason, admin_notes, submitted_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?)
        `).run(
          submissionId,
          user.id,
          name,
          dobStr || null,
          addressStr || null,
          idTypeStr,
          idNumberStr,
          documentsJson,
          now,
          now
        );

        upsertProfileKycStatus(user.id, 'pending', now);
        insertNotification(
          user.id,
          'KYC Submission Received',
          'Your KYC documents are under review. We will notify you once verified.',
          now
        );

        if (isEmailConfigured()) {
          const html = buildKycEmailHtml(
            'KYC Submission Received',
            'We have received your KYC documents and they are now under review. We will notify you once verification is complete.'
          );
          void sendEmail({ to: user.email, subject: 'KYC Verification Received', html })
            .catch((e) => console.warn('[KYC Email] Submit confirmation failed:', e));
        }

        res.status(201).json({
          success: true,
          submission: { id: submissionId, status: 'pending', submittedAt: now },
        });
      } catch (err) {
        // DB failed — remove stored documents to avoid orphans.
        for (const f of savedFilenames) {
          try { fs.unlinkSync(path.join(KYC_DOCS_DIR, f)); } catch { /* ignore */ }
        }
        console.error('[KYC Submit] Database error:', err);
        res.status(500).json({ error: 'Failed to submit KYC verification.' });
      }
    } catch (err) {
      console.error('[KYC Submit] Unexpected error:', err);
      res.status(500).json({ error: 'Failed to submit KYC verification.' });
    }
  });

  // =========================================================================
  // GET /api/user/kyc — current user's latest submission + profile status
  // =========================================================================
  app.get('/api/user/kyc', authenticate, (req: Request, res: Response): void => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const profile = db.prepare('SELECT kyc_status FROM profiles WHERE user_id = ?').get(user.id) as any;
      const kycStatus = profile?.kyc_status || 'unverified';

      const submission = latestSubmissionForUser(user.id);
      if (!submission) {
        res.json({ submission: null, kycStatus });
        return;
      }

      res.json({
        submission: {
          id: submission.id,
          fullName: submission.full_name,
          dob: submission.dob,
          address: submission.address,
          idType: submission.id_type,
          idNumber: submission.id_number,
          status: submission.status,
          rejectionReason: submission.rejection_reason,
          documents: parseDocumentsJson(submission.documents_json),
          submittedAt: submission.submitted_at,
          reviewedAt: submission.reviewed_at,
        },
        kycStatus,
      });
    } catch (err) {
      console.error('[KYC User Status] Error:', err);
      res.status(500).json({ error: 'Failed to load KYC status.' });
    }
  });

  // =========================================================================
  // GET /api/user/kyc/docs/:file — owner-only private document access
  // =========================================================================
  app.get('/api/user/kyc/docs/:file', authenticate, (req: Request, res: Response): void => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const safeName = path.basename(String(req.params.file || ''));
      if (!safeName || safeName !== req.params.file) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }

      const submission = latestSubmissionForUser(user.id);
      const documents = submission ? parseDocumentsJson(submission.documents_json) : [];
      const allowed = documents.some((doc) => doc.filename === safeName);
      if (!allowed) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }

      const filePath = path.join(KYC_DOCS_DIR, safeName);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }

      res.sendFile(filePath);
    } catch (err) {
      console.error('[KYC User Doc] Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to retrieve document.' });
      }
    }
  });

  // =========================================================================
  // GET /api/admin/kyc/list — staff list of submissions (optional status filter)
  // =========================================================================
  app.get('/api/admin/kyc/list', authenticate, staffOnly, (req: Request, res: Response): void => {
    try {
      const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim() : '';
      const validStatuses: string[] = ['pending', 'approved', 'rejected'];

      let rows: any[];
      if (statusFilter) {
        if (!validStatuses.includes(statusFilter)) {
          res.status(400).json({ error: 'Invalid status filter. Use pending, approved, or rejected.' });
          return;
        }
        rows = db.prepare(`
          SELECT s.id, s.user_id, s.full_name, s.id_type, s.id_number, s.status,
                 s.submitted_at, s.reviewed_at, s.rejection_reason, s.documents_json,
                 u.email AS user_email, u.name AS user_name, u.phone AS user_phone
          FROM kyc_submissions s
          LEFT JOIN users u ON u.id = s.user_id
          WHERE s.status = ?
          ORDER BY s.submitted_at DESC
        `).all(statusFilter) as any[];
      } else {
        rows = db.prepare(`
          SELECT s.id, s.user_id, s.full_name, s.id_type, s.id_number, s.status,
                 s.submitted_at, s.reviewed_at, s.rejection_reason, s.documents_json,
                 u.email AS user_email, u.name AS user_name, u.phone AS user_phone
          FROM kyc_submissions s
          LEFT JOIN users u ON u.id = s.user_id
          ORDER BY s.submitted_at DESC
        `).all() as any[];
      }

      const submissions = rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        full_name: r.full_name,
        id_type: r.id_type,
        id_number: r.id_number,
        status: r.status,
        submitted_at: r.submitted_at,
        reviewed_at: r.reviewed_at,
        user_email: r.user_email,
        user_name: r.user_name,
        user_phone: r.user_phone,
        documents_count: parseDocumentsJson(r.documents_json).length,
        rejection_reason: r.rejection_reason,
      }));

      res.json({ success: true, submissions });
    } catch (err) {
      console.error('[KYC Admin List] Error:', err);
      res.status(500).json({ error: 'Failed to list KYC submissions.' });
    }
  });

  // =========================================================================
  // GET /api/admin/kyc/:id — staff full detail (incl. document list)
  // =========================================================================
  app.get('/api/admin/kyc/:id', authenticate, staffOnly, (req: Request, res: Response): void => {
    try {
      const row = db.prepare(`
        SELECT s.*, u.email AS user_email, u.name AS user_name, u.phone AS user_phone
        FROM kyc_submissions s
        LEFT JOIN users u ON u.id = s.user_id
        WHERE s.id = ?
      `).get(String(req.params.id || '')) as any;

      if (!row) {
        res.status(404).json({ error: 'KYC submission not found.' });
        return;
      }

      res.json({
        success: true,
        submission: {
          id: row.id,
          user_id: row.user_id,
          full_name: row.full_name,
          dob: row.dob,
          address: row.address,
          id_type: row.id_type,
          id_number: row.id_number,
          status: row.status,
          rejection_reason: row.rejection_reason,
          admin_notes: row.admin_notes,
          submitted_at: row.submitted_at,
          reviewed_at: row.reviewed_at,
          reviewed_by: row.reviewed_by,
          documents: parseDocumentsJson(row.documents_json),
          user_email: row.user_email,
          user_name: row.user_name,
          user_phone: row.user_phone,
        },
      });
    } catch (err) {
      console.error('[KYC Admin Detail] Error:', err);
      res.status(500).json({ error: 'Failed to load KYC submission.' });
    }
  });

  // =========================================================================
  // GET /api/admin/kyc/docs/:file — staff private document access
  // =========================================================================
  app.get('/api/admin/kyc/docs/:file', authenticate, staffOnly, (req: Request, res: Response): void => {
    try {
      const safeName = path.basename(String(req.params.file || ''));
      if (!safeName || safeName !== req.params.file) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }

      const filePath = path.join(KYC_DOCS_DIR, safeName);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }

      res.sendFile(filePath);
    } catch (err) {
      console.error('[KYC Admin Doc] Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to retrieve document.' });
      }
    }
  });

  // =========================================================================
  // PUT /api/admin/kyc/:id/status — staff approve/reject a submission
  // =========================================================================
  app.put('/api/admin/kyc/:id/status', authenticate, staffOnly, (req: Request, res: Response): void => {
    try {
      const staff = (req as any).user;
      if (!staff || !staff.id) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }

      const { status, reason, adminNotes, admin_notes } = req.body || {};
      const newStatus = String(status || '').trim();
      const rejectionReason = newStatus === 'rejected' ? String(reason || '').trim() : null;

      if (newStatus !== 'approved' && newStatus !== 'rejected') {
        res.status(400).json({ error: 'Status must be either "approved" or "rejected".' });
        return;
      }
      if (newStatus === 'rejected' && (!rejectionReason || rejectionReason.length < 5)) {
        res.status(400).json({ error: 'A rejection reason of at least 5 characters is required.' });
        return;
      }

      const submission = db.prepare('SELECT * FROM kyc_submissions WHERE id = ?').get(String(req.params.id || '')) as any;
      if (!submission) {
        res.status(404).json({ error: 'KYC submission not found.' });
        return;
      }
      if (submission.status === 'approved' || submission.status === 'rejected') {
        res.status(409).json({ error: 'This KYC submission has already been reviewed.' });
        return;
      }

      const notes =
        adminNotes !== undefined ? String(adminNotes).trim() :
        admin_notes !== undefined ? String(admin_notes).trim() :
        (submission.admin_notes || '');

      const now = new Date().toISOString();

      db.prepare(`
        UPDATE kyc_submissions
        SET status = ?, rejection_reason = ?, admin_notes = ?, reviewed_at = ?, reviewed_by = ?, updated_at = ?
        WHERE id = ?
      `).run(newStatus, rejectionReason, notes, now, staff.id, now, submission.id);

      upsertProfileKycStatus(submission.user_id, newStatus, now);

      const userRow = db.prepare('SELECT email FROM users WHERE id = ?').get(submission.user_id) as any;

      if (newStatus === 'approved') {
        insertNotification(
          submission.user_id,
          'KYC Approved',
          'Your KYC verification was approved.',
          now
        );
        if (isEmailConfigured() && userRow?.email) {
          void sendEmail({
            to: userRow.email,
            subject: 'KYC Approved',
            html: buildKycEmailHtml('KYC Approved', 'Congratulations! Your KYC verification has been approved.'),
          }).catch((e) => console.warn('[KYC Email] Approval email failed:', e));
        }
      } else {
        insertNotification(
          submission.user_id,
          'KYC Rejected',
          `Your KYC verification was rejected. Reason: ${rejectionReason}`,
          now
        );
        if (isEmailConfigured() && userRow?.email) {
          void sendEmail({
            to: userRow.email,
            subject: 'KYC Rejected',
            html: buildKycEmailHtml('KYC Rejected', `Your KYC verification was rejected. Reason: ${rejectionReason}`),
          }).catch((e) => console.warn('[KYC Email] Rejection email failed:', e));
        }
      }

      logAudit(staff.id, staff.name, 'KYC_REVIEWED', 'kyc_submission', submission.id, {
        status: newStatus,
        reason: rejectionReason,
      }, req);

      const updated = db.prepare('SELECT * FROM kyc_submissions WHERE id = ?').get(submission.id) as any;
      res.json({
        success: true,
        submission: {
          id: updated.id,
          user_id: updated.user_id,
          full_name: updated.full_name,
          dob: updated.dob,
          address: updated.address,
          id_type: updated.id_type,
          id_number: updated.id_number,
          status: updated.status,
          rejection_reason: updated.rejection_reason,
          admin_notes: updated.admin_notes,
          submitted_at: updated.submitted_at,
          reviewed_at: updated.reviewed_at,
          reviewed_by: updated.reviewed_by,
          documents: parseDocumentsJson(updated.documents_json),
        },
      });
    } catch (err) {
      console.error('[KYC Admin Review] Error:', err);
      res.status(500).json({ error: 'Failed to update KYC submission status.' });
    }
  });
}
