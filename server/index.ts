import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  db,
  databaseDirectory,
  ensureDbReady,
  getPersistenceInfo,
  hashPassword,
  verifyPassword,
  generateToken,
  createSignedToken,
  verifySignedToken,
  syncOfficialValorantSkins,
  validateImageMagicBytes,
  saveUploadedAsset,
  readUploadedAsset,
  type DbExecutor,
} from './db.js';
import { verifyRiotId } from './riot.js';
import { VALORANT_RANKS } from '../src/data/rank-pricing.js';
import { registerOverhaulRoutes } from './overhaulRoutes.js';
import { registerAdvertisementRoutes } from './advertisementRoutes.js';
import { registerKycRoutes } from './kycRoutes.js';
import { registerEmiRoutes } from './emiRoutes.js';
import {
  sendOrderPendingVerificationEmail,
  sendIndianVPCodeIssuedEmail,
  sendOrderPaymentVerifiedEmail,
  sendInventoryShortageAlert,
  sendPaymentRejectedEmail,
  sendEmail,
  getTransporter,
  isEmailConfigured,
  sendPasswordRecoveryOtpEmail,
  sendRegistrationOtpEmail,
  sendLoginOtpEmail,
  sendWelcomeVerificationEmail,
  sendOrderFulfilledEmail
} from './email.js';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS & Security Headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Body parsing with 15MB limit for payment screenshots & receipts
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Prevent edge/CDN or browser caching of dynamic JSON API responses
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/uploads/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Ensure database schema, seed data, and remote Turso bootstrap complete on cold starts
app.use(['/api', '/uploads'], async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    console.error('[DB Ready Middleware Error]:', err);
    res.status(503).json({ error: 'Database initializing or unreachable.' });
  }
});

// Serve uploaded assets from runtime disk, bundled data/uploads, or SQL uploaded_assets
const serveUploadHandler: express.RequestHandler = async (req, res) => {
  try {
    const requested = path.basename(String(req.params.filename || ''));
    if (!requested || requested.startsWith('kycdoc_')) {
      res.status(404).json({ error: 'Uploaded file not found' });
      return;
    }
    await ensureDbReady();
    const asset = await readUploadedAsset(req.params.filename);
    if (!asset) {
      res.status(404).json({ error: 'Uploaded file not found' });
      return;
    }
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(asset.buffer);
  } catch (err) {
    console.error('[Serve Upload Error]:', err);
    res.status(500).json({ error: 'Failed to load uploaded asset.' });
  }
};
app.get('/uploads/:filename', serveUploadHandler);
app.get('/api/uploads/:filename', serveUploadHandler);

// Health Check
app.get('/api/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureDbReady();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      persistence: getPersistenceInfo(),
    });
  } catch (err: any) {
    console.error('[Health Check Error]:', err);
    res.status(503).json({
      status: 'error',
      error: err?.message || 'Database unreachable.',
      persistence: getPersistenceInfo(),
    });
  }
});

// Upload Payment Receipt / Evidence Image (accepts base64 data URL)
app.post('/api/upload', async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, filename } = req.body || {};
    if (!image || typeof image !== 'string') {
      res.status(400).json({ error: 'Image data URL is required.' });
      return;
    }

    const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) {
      res.status(400).json({ error: 'Invalid image format. Expected base64 data URL (e.g. data:image/png;base64,...).' });
      return;
    }

    const ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
    const buffer = Buffer.from(matches[2], 'base64');

    // P3-F4: verify the decoded bytes match the declared image type before storing.
    if (!validateImageMagicBytes(buffer, matches[1])) {
      res.status(400).json({ error: 'File content does not match declared format.' });
      return;
    }

    if (buffer.length > 10 * 1024 * 1024) {
      res.status(400).json({ error: 'Image exceeds maximum 10MB file size limit.' });
      return;
    }

    const safeName = `receipt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const url = await saveUploadedAsset(safeName, '', buffer);

    res.json({
      success: true,
      url,
      filename: safeName,
      size: buffer.length
    });
  } catch (err: any) {
    console.error('[Upload Error]:', err);
    res.status(500).json({ error: 'Failed to process and store uploaded image.' });
  }
});

// ==========================================
// RIOT GAMES VALORANT ID VERIFICATION API
// ==========================================

// Verify a Riot ID / username without accessing or returning sensitive private data (email, etc.)
app.post('/api/riot/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { riotId, gameName, tagLine } = req.body || {};
    const rawName = gameName || riotId;
    const rawTag = tagLine;

    if (!rawName) {
      res.status(400).json({
        exists: false,
        verified: false,
        error: 'Riot username (or Riot ID as Name#Tag) is required.'
      });
      return;
    }

    const result = await verifyRiotId(String(rawName), rawTag ? String(rawTag) : undefined);
    if (!result.exists) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err) {
    console.error('Riot verification error:', err);
    res.status(500).json({ error: 'Server error during Riot ID verification.' });
  }
});

app.get('/api/riot/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const riotId = req.query.riotId as string;
    const gameName = req.query.gameName as string;
    const tagLine = req.query.tagLine as string;
    const rawName = gameName || riotId;

    if (!rawName) {
      res.status(400).json({
        exists: false,
        verified: false,
        error: 'Riot username (or Riot ID as Name#Tag) is required.'
      });
      return;
    }

    const result = await verifyRiotId(String(rawName), tagLine ? String(tagLine) : undefined);
    if (!result.exists) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err) {
    console.error('Riot verification error:', err);
    res.status(500).json({ error: 'Server error during Riot ID verification.' });
  }
});

// Extend Express Request
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  account_number?: string | null;
  phone: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  riot_id: string | null;
  riot_verified?: number;
  role: 'user' | 'seller' | 'moderator' | 'admin' | 'superadmin';
  status: 'active' | 'suspended' | 'banned' | 'pending_verification';
  email_verified: number;
  bio?: string;
  avatar?: string;
  discord_tag?: string;
  wallet_balance?: number;
  kyc_status?: string;
  total_orders?: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  token?: string;
}

// Authentication Middleware
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. No bearer token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const now = new Date().toISOString();

    // 1. Check stateless cryptographic signed token first (persistent across all serverless containers)
    const signedPayload = verifySignedToken(token);
    if (signedPayload) {
      let userRow = await db.prepare(`
        SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.phone, u.account_number, u.city, u.state, u.pincode, u.riot_id, u.riot_verified, u.role, u.status, u.email_verified,
               p.bio, p.avatar, p.discord_tag, p.wallet_balance, p.kyc_status,
               COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id), 0) AS total_orders
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = ? OR u.email = ?
      `).get(signedPayload.id, signedPayload.email) as any;

      if (!userRow) {
        try {
          await db.prepare(`
            INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, role, status, email_verified, created_at, updated_at)
            VALUES (?, ?, 'SIGNED_TOKEN_USER', 'SALT', ?, ?, ?, 1, ?, ?)
          `).run(signedPayload.id, signedPayload.email, signedPayload.name, signedPayload.role, signedPayload.status || 'active', now, now);

          await db.prepare(`
            INSERT OR IGNORE INTO profiles (user_id, wallet_balance, kyc_status, total_orders, created_at)
            VALUES (?, 0, 'unverified', 0, ?)
          `).run(signedPayload.id, now);

          userRow = await db.prepare(`
            SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.phone, u.account_number, u.city, u.state, u.pincode, u.riot_id, u.riot_verified, u.role, u.status, u.email_verified,
                   p.bio, p.avatar, p.discord_tag, p.wallet_balance, p.kyc_status,
                   COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id), 0) AS total_orders
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.id = ?
          `).get(signedPayload.id) as any;
        } catch (err) {
          console.warn('[Auth] Container user hydration warning:', err);
        }
      }

      if (userRow) {
        if (userRow.status === 'banned') {
          res.status(403).json({ error: 'Account has been permanently banned by platform administration.' });
          return;
        }
        if (userRow.status === 'suspended') {
          res.status(403).json({ error: 'Account is temporarily suspended. Contact support.' });
          return;
        }

        req.user = {
          id: userRow.id,
          email: userRow.email,
          name: userRow.name,
          first_name: userRow.first_name,
          last_name: userRow.last_name,
          phone: userRow.phone,
          account_number: userRow.account_number,
          city: userRow.city,
          state: userRow.state,
          pincode: userRow.pincode,
          riot_id: userRow.riot_id,
          riot_verified: userRow.riot_verified || 0,
          role: userRow.role,
          status: userRow.status,
          email_verified: userRow.email_verified,
          bio: userRow.bio,
          avatar: userRow.avatar,
          discord_tag: userRow.discord_tag,
          wallet_balance: userRow.wallet_balance,
          kyc_status: userRow.kyc_status,
          total_orders: userRow.total_orders,
        };
        req.token = token;
        next();
        return;
      }
    }

    // 2. Check sessions table (for legacy or direct random tokens)
    const row = await db.prepare(`
      SELECT s.token, s.user_id, s.expires_at,
             u.id, u.email, u.name, u.first_name, u.last_name, u.phone, u.account_number, u.city, u.state, u.pincode, u.riot_id, u.riot_verified, u.role, u.status, u.email_verified,
             p.bio, p.avatar, p.discord_tag, p.wallet_balance, p.kyc_status,
             COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id), 0) AS total_orders
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE s.token = ?
    `).get(token) as any;

    if (row) {
      if (row.expires_at < now) {
        await db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        res.status(401).json({ error: 'Session has expired. Please log in again.' });
        return;
      }

      if (row.status === 'banned') {
        res.status(403).json({ error: 'Account has been permanently banned by platform administration.' });
        return;
      }

      if (row.status === 'suspended') {
        res.status(403).json({ error: 'Account is temporarily suspended. Contact support.' });
        return;
      }

      req.user = {
        id: row.id,
        email: row.email,
        name: row.name,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone,
        account_number: row.account_number,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        riot_id: row.riot_id,
        riot_verified: row.riot_verified || 0,
        role: row.role,
        status: row.status,
        email_verified: row.email_verified,
        bio: row.bio,
        avatar: row.avatar,
        discord_tag: row.discord_tag,
        wallet_balance: row.wallet_balance,
        kyc_status: row.kyc_status,
        total_orders: row.total_orders,
      };
      req.token = token;
      next();
      return;
    }

    res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  } catch (err) {
    console.error('[Auth Middleware Error]:', err);
    res.status(500).json({ error: 'Authentication check failed.' });
  }
}

// Role Authorization Middleware
export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Role '${req.user.role}' lacks permission for this administrative area.`
      });
      return;
    }

    next();
  };
}

// Reliable server-side IP extraction function
export function extractClientIp(req: any): string {
  if (!req) return 'unavailable';
  const forwarded = req.headers?.['x-forwarded-for'];
  let rawIp = '';
  if (typeof forwarded === 'string') {
    rawIp = forwarded.split(',')[0].trim();
  } else if (typeof req.headers?.['cf-connecting-ip'] === 'string') {
    rawIp = req.headers['cf-connecting-ip'].trim();
  } else if (typeof req.headers?.['x-real-ip'] === 'string') {
    rawIp = req.headers['x-real-ip'].trim();
  } else if (req.socket?.remoteAddress) {
    rawIp = req.socket.remoteAddress;
  } else if (req.ip) {
    rawIp = req.ip;
  }

  if (!rawIp) return 'unavailable';

  // Normalize IPv6-mapped IPv4 addresses
  if (rawIp.startsWith('::ffff:')) {
    rawIp = rawIp.replace('::ffff:', '');
  }
  if (rawIp === '::1') {
    rawIp = '127.0.0.1';
  }

  const isIpv4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(rawIp);
  const isIpv6 = /^[0-9a-fA-F:]{2,39}$/.test(rawIp);

  return isIpv4 || isIpv6 ? rawIp : 'unavailable';
}

// ==========================================
// Login rate limiting (P2-F5): lightweight in-memory limiter keyed by IP.
// Counts failed login attempts within a sliding 15-minute window; a successful
// login clears the counter for that IP. Only affects POST /api/auth/login.
// ==========================================
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_RATE_MAX_FAILURES = 10;
const loginFailuresByIp = new Map<string, number[]>();

function pruneLoginFailures(ip: string, now: number): void {
  const list = loginFailuresByIp.get(ip);
  if (!list) return;
  const fresh = list.filter((t) => now - t < LOGIN_RATE_WINDOW_MS);
  if (fresh.length === 0) {
    loginFailuresByIp.delete(ip);
  } else {
    loginFailuresByIp.set(ip, fresh);
  }
}

function recordLoginFailure(ip: string): void {
  const now = Date.now();
  pruneLoginFailures(ip, now);
  const list = loginFailuresByIp.get(ip) || [];
  list.push(now);
  loginFailuresByIp.set(ip, list);
}

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  pruneLoginFailures(ip, now);
  const list = loginFailuresByIp.get(ip);
  return !!list && list.length >= LOGIN_RATE_MAX_FAILURES;
}

function clearLoginFailures(ip: string): void {
  loginFailuresByIp.delete(ip);
}

// Helper to log administrative actions with normalized IP
async function logAudit(
  actorId: string,
  actorName: string,
  action: string,
  targetType: string,
  targetId: string,
  details: any,
  ipOrReq: any,
  executor: DbExecutor = db
): Promise<void> {
  const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
  let cleanIp = 'unavailable';

  if (typeof ipOrReq === 'object' && ipOrReq !== null && ('headers' in ipOrReq || 'ip' in ipOrReq)) {
    cleanIp = extractClientIp(ipOrReq);
  } else if (typeof ipOrReq === 'string') {
    cleanIp = ipOrReq.replace(/^::ffff:/, '');
    if (cleanIp === '::1') cleanIp = '127.0.0.1';
    if (!cleanIp || cleanIp === 'undefined' || cleanIp === 'null') cleanIp = 'unavailable';
  }

  await executor.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_name, action, target_type, target_id, details_json, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    auditId,
    actorId,
    actorName,
    action,
    targetType,
    targetId,
    JSON.stringify(details),
    cleanIp,
    new Date().toISOString()
  );
}

// Anti-Fraud Scanner for internal chats and customer orders
export function scanMessageForAntiFraud(text: string): { flagged: boolean; reason?: string } {
  const phoneRegex = /(?:(?:\+|0{0,2})91[\s-]*)?[6789]\d{9}|\b\d{10}\b/;
  if (phoneRegex.test(text)) {
    return { flagged: true, reason: 'Direct telephone number or calling identifier detected.' };
  }

  const upiRegex = /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/;
  if (upiRegex.test(text) && !text.includes('@vib.gg')) {
    return { flagged: true, reason: 'External payment / UPI VPA handle detected.' };
  }

  const keywordRegex = /\b(?:whatsapp|telegram|t\.me|wa\.me|discord\.gg|phonepe\s*no|gpay\s*no|paytm\s*no|pay\s*outside)\b/i;
  if (keywordRegex.test(text)) {
    return { flagged: true, reason: 'Off-platform contact or unverified third-party transaction request detected.' };
  }

  return { flagged: false };
}

// Auto-generate Sequential Invoice ID (GST / Accounting Compliant)
export async function generateNextInvoiceId(executor: DbExecutor = db): Promise<string> {
  const rows = await executor.prepare("SELECT id FROM invoices WHERE id LIKE 'VIB-INV-%'").all() as { id: string }[];
  let maxNum = 0;
  for (const r of rows) {
    const match = r.id.match(/^VIB-INV-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return 'VIB-INV-' + String(maxNum + 1).padStart(4, '0');
}

// ==========================================
// PUBLIC PRODUCTS & CATALOG ROUTES
// ==========================================

// Get Catalog Products with optional filtering, search, and sorting
app.get('/api/products', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search, sort } = req.query;
    let query = 'SELECT * FROM products WHERE active = 1';
    const params: any[] = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    if (sort === 'price_asc') {
      query += ' ORDER BY price_inr ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY price_inr DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const rows = await db.prepare(query).all(...params);
    const products = rows.map((p: any) => ({
      ...p,
      details: p.details_json ? JSON.parse(p.details_json) : {}
    }));

    res.json({ products });
  } catch (err) {
    console.error('[Products List Error]:', err);
    res.status(500).json({ error: 'Failed to load products.' });
  }
});

// Get Single Product by ID
app.get('/api/products/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
    if (!product) {
      res.status(404).json({ error: 'Product not found in catalog.' });
      return;
    }
    res.json({
      product: {
        ...product,
        details: product.details_json ? JSON.parse(product.details_json) : {}
      }
    });
  } catch (err) {
    console.error('[Get Product Error]:', err);
    res.status(500).json({ error: 'Failed to load product details.' });
  }
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// 0A. Send Registration Email OTP
app.post('/api/auth/register-otp/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, firstName } = req.body || {};
    if (!email || !String(email).trim()) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }
    const emailTrimmed = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      res.status(400).json({ error: 'Invalid email address format.' });
      return;
    }

    // Check duplicate
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(emailTrimmed);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists. Please sign in instead.' });
      return;
    }

    // Cooldown check (60s)
    const recentOtp = await db.prepare(`
      SELECT created_at FROM email_otps
      WHERE email = ? AND purpose = 'register'
      ORDER BY created_at DESC LIMIT 1
    `).get(emailTrimmed) as any;

    if (recentOtp) {
      const diffMs = Date.now() - new Date(recentOtp.created_at).getTime();
      if (diffMs < 60000) {
        const remaining = Math.ceil((60000 - diffMs) / 1000);
        res.status(429).json({ error: `Please wait ${remaining}s before requesting a new OTP.` });
        return;
      }
    }

    // Generate 6-digit crypto OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const id = 'otp_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db.prepare(`
      INSERT INTO email_otps (id, email, otp_code, purpose, attempts, expires_at, created_at)
      VALUES (?, ?, ?, 'register', 0, ?, ?)
    `).run(id, emailTrimmed, otpCode, expiresAt, now);

    const delivery = await sendRegistrationOtpEmail(emailTrimmed, otpCode, firstName);
    if (!delivery.success) {
      await db.prepare('DELETE FROM email_otps WHERE id = ?').run(id);
      res.status(503).json({
        error: delivery.error || 'Verification email could not be delivered. Please try again later.',
      });
      return;
    }

    res.json({
      success: true,
      message: `Verification code sent to ${emailTrimmed}. Valid for 10 minutes.`,
    });
  } catch (err: any) {
    console.error('[Register OTP Send Error]:', err);
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
  }
});

// 0B. Register With Email OTP
app.post('/api/auth/register-with-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      otp,
      accountNumber,
      phone,
      city,
      state,
      pincode,
    } = req.body || {};

    if (!firstName?.trim() || !lastName?.trim()) {
      res.status(400).json({ error: 'First name and last name are required.' });
      return;
    }
    if (!email?.trim()) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }
    if (!otp?.trim()) {
      res.status(400).json({ error: 'Email verification OTP is required.' });
      return;
    }
    const cleanAccountNumber = accountNumber !== undefined ? String(accountNumber).trim() : '';
    const rawPhoneDigits = phone ? String(phone).trim().replace(/[\s+-]/g, '').slice(-10) : '';
    const accountAsPhone = /^[6-9]\d{9}$/.test(cleanAccountNumber.replace(/[\s+-]/g, '').slice(-10))
      ? cleanAccountNumber.replace(/[\s+-]/g, '').slice(-10)
      : '';
    const cleanPhone = rawPhoneDigits && /^[6-9]\d{9}$/.test(rawPhoneDigits)
      ? rawPhoneDigits
      : accountAsPhone;

    if (!cleanAccountNumber && !cleanPhone) {
      res.status(400).json({ error: 'Please enter your Account Number.' });
      return;
    }
    if (cleanAccountNumber && cleanAccountNumber.length < 4) {
      res.status(400).json({ error: 'Please enter a valid Account Number.' });
      return;
    }
    if (!city?.trim() || !state?.trim()) {
      res.status(400).json({ error: 'City and state are required.' });
      return;
    }
    if (!pincode?.trim() || !/^\d{6}$/.test(pincode.trim())) {
      res.status(400).json({ error: 'Please enter a valid 6-digit Indian PIN code.' });
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Verify OTP
    const otpRecord = await db.prepare(`
      SELECT * FROM email_otps
      WHERE email = ? AND purpose = 'register'
      ORDER BY created_at DESC LIMIT 1
    `).get(emailTrimmed) as any;

    if (!otpRecord) {
      res.status(400).json({ error: 'No verification code found. Please request a new code.' });
      return;
    }

    if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
      return;
    }

    if (otpRecord.attempts >= 5) {
      res.status(429).json({ error: 'Too many invalid attempts. Please request a new OTP.' });
      return;
    }

    if (otpRecord.otp_code !== otp.trim()) {
      await db.prepare('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?').run(otpRecord.id);
      res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
      return;
    }

    // Duplicate check
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(emailTrimmed);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists. Please sign in.' });
      return;
    }

    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const autoPassword = crypto.randomBytes(16).toString('hex');
    const { hash, salt } = hashPassword(autoPassword);
    const now = new Date().toISOString();

    const token = createSignedToken({
      id: userId,
      email: emailTrimmed,
      name: fullName,
      role: 'user',
      status: 'active',
    });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await db.transaction(async (tx) => {
      await tx.prepare("DELETE FROM email_otps WHERE email = ? AND purpose = 'register'").run(emailTrimmed);

      await tx.prepare(`
        INSERT INTO users (
          id, email, password_hash, salt, name, first_name, last_name, phone, account_number,
          city, state, pincode, role, status, email_verified, terms_accepted_at,
          terms_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 'active', 1, ?, 'platform-escrow-v1', ?, ?)
      `).run(
        userId,
        emailTrimmed,
        hash,
        salt,
        fullName,
        firstName.trim(),
        lastName.trim(),
        cleanPhone || '',
        cleanAccountNumber || cleanPhone || '',
        city.trim(),
        state.trim(),
        pincode.trim(),
        now,
        now,
        now
      );

      // Profile record
      await tx.prepare(`
        INSERT INTO profiles (user_id, bio, avatar, discord_tag, wallet_balance, kyc_status, total_orders, created_at)
        VALUES (?, ?, ?, ?, 0.0, 'unverified', 0, ?)
      `).run(
        userId,
        'Verified VIB Member',
        null,
        null,
        now
      );

      await tx.prepare(`
        INSERT INTO sessions (token, user_id, expires_at, created_at)
        VALUES (?, ?, ?, ?)
      `).run(token, userId, expiresAt, now);
    });

    const userObj = {
      id: userId,
      email: emailTrimmed,
      name: fullName,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: cleanPhone || '',
      account_number: cleanAccountNumber || cleanPhone || '',
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      role: 'user',
      status: 'active',
      email_verified: 1,
    };

    res.json({
      success: true,
      token,
      user: userObj,
      message: 'Account successfully registered and verified.',
    });
  } catch (err: any) {
    console.error('[Register With OTP Error]:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// 0C. Send Login Email OTP
app.post('/api/auth/login-otp/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body || {};
    if (!email || !String(email).trim()) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }
    const emailTrimmed = String(email).trim().toLowerCase();

    // Check account exists
    const user = await db.prepare('SELECT id, name, status FROM users WHERE email = ?').get(emailTrimmed) as any;
    if (!user) {
      res.status(404).json({ error: 'No account found with this email. Please create an account.' });
      return;
    }

    if (user.status === 'suspended' || user.status === 'banned') {
      res.status(403).json({ error: 'Your account is suspended. Please contact support.' });
      return;
    }

    // Cooldown check (60s)
    const recentOtp = await db.prepare(`
      SELECT created_at FROM email_otps
      WHERE email = ? AND purpose = 'login'
      ORDER BY created_at DESC LIMIT 1
    `).get(emailTrimmed) as any;

    if (recentOtp) {
      const diffMs = Date.now() - new Date(recentOtp.created_at).getTime();
      if (diffMs < 60000) {
        const remaining = Math.ceil((60000 - diffMs) / 1000);
        res.status(429).json({ error: `Please wait ${remaining}s before requesting another OTP.` });
        return;
      }
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const id = 'otp_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db.prepare(`
      INSERT INTO email_otps (id, email, otp_code, purpose, attempts, expires_at, created_at)
      VALUES (?, ?, ?, 'login', 0, ?, ?)
    `).run(id, emailTrimmed, otpCode, expiresAt, now);

    const delivery = await sendLoginOtpEmail(emailTrimmed, otpCode);
    if (!delivery.success) {
      await db.prepare('DELETE FROM email_otps WHERE id = ?').run(id);
      res.status(503).json({
        error: delivery.error || 'Sign-in code email could not be delivered. Please try again later.',
      });
      return;
    }

    res.json({
      success: true,
      message: `Sign-in code sent to ${emailTrimmed}. Valid for 10 minutes.`,
    });
  } catch (err: any) {
    console.error('[Login OTP Send Error]:', err);
    res.status(500).json({ error: 'Failed to send sign-in code.' });
  }
});

// 0D. Verify Login Email OTP
app.post('/api/auth/login-with-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body || {};
    if (!email?.trim() || !otp?.trim()) {
      res.status(400).json({ error: 'Email and verification OTP are required.' });
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const otpRecord = await db.prepare(`
      SELECT * FROM email_otps
      WHERE email = ? AND purpose = 'login'
      ORDER BY created_at DESC LIMIT 1
    `).get(emailTrimmed) as any;

    if (!otpRecord) {
      res.status(400).json({ error: 'No active sign-in code found. Please request a new code.' });
      return;
    }

    if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'Sign-in code has expired. Please request a new code.' });
      return;
    }

    if (otpRecord.attempts >= 5) {
      res.status(429).json({ error: 'Too many invalid attempts. Please request a new code.' });
      return;
    }

    if (otpRecord.otp_code !== otp.trim()) {
      await db.prepare('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?').run(otpRecord.id);
      res.status(400).json({ error: 'Invalid sign-in code. Please try again.' });
      return;
    }

    await db.prepare("DELETE FROM email_otps WHERE email = ? AND purpose = 'login'").run(emailTrimmed);

    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(emailTrimmed) as any;
    if (!user) {
      res.status(404).json({ error: 'User record not found.' });
      return;
    }

    const token = createSignedToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    });
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, user.id, expiresAt, now);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        account_number: user.account_number,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        role: user.role,
        status: user.status,
        email_verified: 1,
      },
    });
  } catch (err: any) {
    console.error('[Login With OTP Error]:', err);
    res.status(500).json({ error: 'Failed to sign in with OTP.' });
  }
});

// 1. Register
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, accountNumber, phone, riot_id, terms_accepted } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Name, email, and password are required fields.' });
      return;
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      res.status(400).json({ error: 'Invalid email address format.' });
      return;
    }

    if (String(password).length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    if (terms_accepted !== true) {
      res.status(400).json({ error: 'You must acknowledge the VIB Marketplace Escrow & Platform Terms.' });
      return;
    }

    // Check duplicate
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(emailTrimmed);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
      return;
    }

    // Validate Riot ID if supplied
    let verifiedRiotId: string | null = null;
    let isRiotVerified = 0;
    if (riot_id && String(riot_id).trim()) {
      const riotCheck = await verifyRiotId(String(riot_id).trim());
      if (!riotCheck.exists) {
        res.status(400).json({
          error: riotCheck.error || 'The provided Riot ID is not a legitimate Valorant account. Please check your username and tag.'
        });
        return;
      }
      verifiedRiotId = riotCheck.riotId;
      isRiotVerified = riotCheck.verified ? 1 : 0;
    }

    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
    const { hash, salt } = hashPassword(password);
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const now = new Date().toISOString();

    const cleanAccountNumber = accountNumber ? String(accountNumber).trim() : null;

    // Generate session token (30 days)
    const token = createSignedToken({
      id: userId,
      email: emailTrimmed,
      name: String(name).trim(),
      role: 'user',
      status: 'active',
    });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await db.transaction(async (tx) => {
      // Default public registrations are 'user' (NEVER admin)
      await tx.prepare(`
        INSERT INTO users (id, email, password_hash, salt, name, account_number, phone, riot_id, riot_verified, role, status, email_verified, verification_code, terms_accepted_at, terms_version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 'active', 1, ?, ?, 'platform-escrow-v1', ?, ?)
      `).run(
        userId,
        emailTrimmed,
        hash,
        salt,
        String(name).trim(),
        cleanAccountNumber,
        phone ? String(phone).trim() : null,
        verifiedRiotId,
        isRiotVerified,
        verificationCode,
        now,
        now,
        now
      );

      // Profile record
      await tx.prepare(`
        INSERT INTO profiles (user_id, bio, avatar, discord_tag, wallet_balance, kyc_status, total_orders, created_at)
        VALUES (?, ?, ?, ?, 0.0, 'unverified', 0, ?)
      `).run(
        userId,
        'New VIB Member',
        null,
        null,
        now
      );

      await tx.prepare(`
        INSERT INTO sessions (token, user_id, expires_at, created_at)
        VALUES (?, ?, ?, ?)
      `).run(token, userId, expiresAt, now);

      // Welcome Notification
      await tx.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
        VALUES (?, ?, ?, ?, 'info', 0, ?)
      `).run(
        'notif_' + crypto.randomBytes(8).toString('hex'),
        userId,
        'Welcome to VIB Digital Services Platform!',
        'Your account has been created. Enjoy verified Valorant VP top-ups, rank journeys, and protected marketplace transactions.',
        now
      );

      await logAudit(userId, name, 'REGISTER_USER', 'user', userId, { email: emailTrimmed }, req.ip || '127.0.0.1', tx);
    });

    sendWelcomeVerificationEmail({
      email: emailTrimmed,
      name: String(name).trim(),
      code: verificationCode,
    }).catch((e) => console.warn('[Welcome Email Deferred]:', e.message));

    res.status(201).json({
      message: 'Registration successful! Welcome to VIB.',
      token,
      user: {
        id: userId,
        email: emailTrimmed,
        name: String(name).trim(),
        account_number: cleanAccountNumber,
        phone: phone ? String(phone).trim() : null,
        riot_id: verifiedRiotId,
        riot_verified: isRiotVerified,
        role: 'user',
        status: 'active',
        email_verified: 1,
        wallet_balance: 0.0,
        kyc_status: 'unverified',
        total_orders: 0
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration. Please try again.' });
  }
});

// 2. Login
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const ip = extractClientIp(req);
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    const userRow = await db.prepare(`
      SELECT u.id, u.email, u.password_hash, u.salt, u.name, u.phone, u.riot_id, u.role, u.status, u.email_verified,
             p.bio, p.avatar, p.discord_tag, p.wallet_balance, p.kyc_status,
             COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id), 0) AS total_orders
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.email = ?
    `).get(emailTrimmed) as any;

    if (!userRow) {
      // P2-F5: rate-limit failed logins per IP.
      if (isLoginRateLimited(ip)) {
        res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
        return;
      }
      recordLoginFailure(ip);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const passwordValid = verifyPassword(password, userRow.password_hash, userRow.salt);
    if (!passwordValid) {
      if (isLoginRateLimited(ip)) {
        res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
        return;
      }
      recordLoginFailure(ip);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (userRow.status === 'banned') {
      res.status(403).json({ error: 'This account has been banned due to policy violation.' });
      return;
    }

    if (userRow.status === 'suspended') {
      res.status(403).json({ error: 'This account is currently suspended. Please contact customer support.' });
      return;
    }

    // Successful login resets this IP's failure counter.
    clearLoginFailures(ip);

    // Generate Session
    const token = createSignedToken({
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      status: userRow.status,
    });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userRow.id, expiresAt, now);

    await logAudit(userRow.id, userRow.name, 'USER_LOGIN', 'session', userRow.id, {}, req.ip || '127.0.0.1');

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        phone: userRow.phone,
        riot_id: userRow.riot_id,
        role: userRow.role,
        status: userRow.status,
        email_verified: userRow.email_verified,
        bio: userRow.bio,
        avatar: userRow.avatar,
        discord_tag: userRow.discord_tag,
        wallet_balance: userRow.wallet_balance,
        kyc_status: userRow.kyc_status,
        total_orders: userRow.total_orders
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during sign-in.' });
  }
});

async function verifyFirebaseIdToken(idToken: string): Promise<{ email: string; uid: string; name?: string; picture?: string } | null> {
  if (!idToken || typeof idToken !== 'string') return null;
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload?.sub || !payload?.email) return null;
    if (projectId && (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`)) {
      return null;
    }
    if (!payload.exp || payload.exp * 1000 <= Date.now()) return null;

    if (header?.kid) {
      const certsRes = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
      if (certsRes.ok) {
        const certs = (await certsRes.json()) as Record<string, string>;
        const cert = certs[header.kid];
        if (cert) {
          const verifier = crypto.createVerify('RSA-SHA256');
          verifier.update(`${parts[0]}.${parts[1]}`);
          verifier.end();
          if (verifier.verify(cert, Buffer.from(parts[2], 'base64url'))) {
            return {
              email: String(payload.email).trim().toLowerCase(),
              uid: String(payload.sub),
              name: payload.name ? String(payload.name) : undefined,
              picture: payload.picture ? String(payload.picture) : undefined,
            };
          }
          return null;
        }
      }
    }

    if (apiKey) {
      const lookupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (lookupRes.ok) {
        const data = (await lookupRes.json()) as any;
        const account = data?.users?.[0];
        if (account?.email && account?.localId) {
          return {
            email: String(account.email).trim().toLowerCase(),
            uid: String(account.localId),
            name: account.displayName ? String(account.displayName) : undefined,
            picture: account.photoUrl ? String(account.photoUrl) : undefined,
          };
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

// 2b. Firebase Authentication & Google Login Bridge
app.post('/api/auth/firebase-login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, photoURL, avatar, uid, idToken } = req.body || {};

    if (!idToken) {
      res.status(401).json({ error: 'Verified Firebase ID token is required.' });
      return;
    }

    const verifiedToken = await verifyFirebaseIdToken(String(idToken));
    if (!verifiedToken) {
      res.status(401).json({ error: 'Invalid or expired Google authentication token.' });
      return;
    }

    if (email && String(email).trim().toLowerCase() !== verifiedToken.email) {
      res.status(401).json({ error: 'Authenticated email does not match Firebase token.' });
      return;
    }

    const emailTrimmed = verifiedToken.email;
    const displayName = String(verifiedToken.name || name || emailTrimmed.split('@')[0]).trim();
    const resolvedAvatar = verifiedToken.picture || photoURL || avatar || null;
    const verifiedUid = verifiedToken.uid || uid || null;
    const now = new Date().toISOString();

    // Check if user already exists
    let userRow = await db.prepare(`
      SELECT u.id, u.email, u.name, u.phone, u.riot_id, u.role, u.status, u.email_verified, u.auth_provider,
             p.bio, p.avatar, p.discord_tag, p.wallet_balance, p.kyc_status,
             COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id), 0) AS total_orders
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.email = ?
    `).get(emailTrimmed) as any;

    let userId: string;

    if (userRow) {
      userId = userRow.id;

      if (userRow.status === 'banned') {
        res.status(403).json({ error: 'This account has been banned due to policy violation.' });
        return;
      }
      if (userRow.status === 'suspended') {
        res.status(403).json({ error: 'This account is currently suspended. Please contact customer support.' });
        return;
      }

      // Update firebase_uid and avatar if available
      try {
        await db.prepare('UPDATE users SET firebase_uid = COALESCE(?, firebase_uid), email_verified = 1, updated_at = ? WHERE id = ?')
          .run(verifiedUid, now, userId);
      } catch {}

      if (resolvedAvatar) {
        try {
          await db.prepare('UPDATE profiles SET avatar = ? WHERE user_id = ?').run(resolvedAvatar, userId);
          userRow.avatar = resolvedAvatar;
        } catch {}
      }
    } else {
      // Provision new user from Google/Firebase
      userId = 'usr_' + crypto.randomBytes(8).toString('hex');
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const { hash, salt } = hashPassword(randomPassword);

      userRow = await db.transaction(async (tx) => {
        await tx.prepare(`
          INSERT INTO users (id, email, password_hash, salt, name, role, status, email_verified, firebase_uid, auth_provider, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'user', 'active', 1, ?, 'google', ?, ?)
        `).run(
          userId,
          emailTrimmed,
          hash,
          salt,
          displayName,
          verifiedUid,
          now,
          now
        );

        await tx.prepare(`
          INSERT INTO profiles (user_id, bio, avatar, discord_tag, wallet_balance, kyc_status, total_orders, created_at)
          VALUES (?, 'Competitive Valorant Enthusiast', ?, NULL, 0.0, 'unverified', 0, ?)
        `).run(
          userId,
          resolvedAvatar || null,
          now
        );

        return tx.prepare(`
          SELECT u.id, u.email, u.name, u.phone, u.riot_id, u.role, u.status, u.email_verified, u.auth_provider,
                 p.bio, p.avatar, p.discord_tag, p.wallet_balance, p.kyc_status,
                 COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id), 0) AS total_orders
          FROM users u
          LEFT JOIN profiles p ON u.id = p.user_id
          WHERE u.id = ?
        `).get(userId);
      });
    }

    // Generate Session Token
    const token = createSignedToken({
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      status: userRow.status,
    });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, expiresAt, now);

    await logAudit(userId, userRow.name, 'FIREBASE_GOOGLE_LOGIN', 'session', userId, { email: emailTrimmed, provider: 'google' }, req.ip || '127.0.0.1');

    res.json({
      message: 'Firebase Google authentication successful.',
      token,
      user: {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        phone: userRow.phone,
        riot_id: userRow.riot_id,
        role: userRow.role,
        status: userRow.status,
        email_verified: userRow.email_verified,
        auth_provider: userRow.auth_provider || 'google',
        bio: userRow.bio,
        avatar: userRow.avatar || resolvedAvatar,
        discord_tag: userRow.discord_tag,
        wallet_balance: userRow.wallet_balance || 0,
        kyc_status: userRow.kyc_status || 'unverified',
        total_orders: userRow.total_orders || 0
      }
    });
  } catch (err: any) {
    console.error('Firebase login error:', err);
    res.status(500).json({ error: 'Server error during Firebase authentication.' });
  }
});

// 3. Logout
app.post('/api/auth/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.token) {
      await db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to terminate session.' });
  }
});

// 4. Me (Get current user)
app.get('/api/auth/me', authenticate, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

// 5. Password Reset Request
app.post('/api/auth/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    // Firebase recovery is preferred by the client. The local-account fallback
    // may issue a code when email service (Resend or SMTP) is configured.
    if (!isEmailConfigured()) {
      res.status(503).json({ error: 'Password recovery is not configured on this server. Please use your identity provider or contact support.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail) as any;
    const genericMessage = 'If the email exists in our registry, password recovery instructions have been sent.';
    if (!user) {
      res.json({ message: genericMessage });
      return;
    }

    // Generate a secure 6-digit OTP code for password recovery
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const resetTokenHash = crypto.createHash('sha256').update(resetCode).digest('hex');
    await db.prepare('UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?').run(resetTokenHash, expiresAt, user.id);

    const delivery = await sendPasswordRecoveryOtpEmail(normalizedEmail, resetCode);
    if (!delivery.success) {
      await db.prepare('UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?').run(user.id);
      res.status(503).json({ error: 'Password recovery email could not be delivered. Please try again later.' });
      return;
    }
    res.json({ message: 'A recovery code has been sent if the email exists in our registry.', requiresCode: true });
  } catch (err) {
    console.error('[Forgot Password Error]:', err);
    res.status(500).json({ error: 'Failed to process password recovery request.' });
  }
});

// 6. Complete Password Reset
app.post('/api/auth/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      res.status(400).json({ error: 'Email, code, and new password are required.' });
      return;
    }
    const cleanCode = String(code).trim();
    if (typeof newPassword !== 'string' || newPassword.length < 8 || (!/^[a-f0-9]{64}$/i.test(cleanCode) && !/^\d{6}$/.test(cleanCode))) {
      res.status(400).json({ error: 'Enter a valid 6-digit recovery code and a password of at least 8 characters.' });
      return;
    }
    const user = await db.prepare('SELECT id, reset_token, reset_token_expires_at FROM users WHERE email = ?').get(String(email).trim().toLowerCase()) as any;
    const submittedCodeHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
    const storedResetHash = typeof user?.reset_token === 'string' && /^[a-f0-9]{64}$/i.test(user.reset_token)
      ? Buffer.from(user.reset_token, 'hex')
      : null;
    const codeMatches = storedResetHash && crypto.timingSafeEqual(storedResetHash, Buffer.from(submittedCodeHash, 'hex'));
    if (!user || !codeMatches || !user.reset_token_expires_at || Date.parse(user.reset_token_expires_at) <= Date.now()) {
      res.status(400).json({ error: 'Invalid or expired verification reset code.' });
      return;
    }

    const { hash, salt } = hashPassword(newPassword);
    await db.transaction(async (tx) => {
      await tx.prepare('UPDATE users SET password_hash = ?, salt = ?, reset_token = NULL, reset_token_expires_at = NULL, updated_at = ? WHERE id = ?')
        .run(hash, salt, new Date().toISOString(), user.id);
      await tx.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    });

    res.json({ message: 'Password has been successfully updated. You may now log in.' });
  } catch (err) {
    console.error('[Reset Password Error]:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// ==========================================
// USER DASHBOARD ROUTES
// ==========================================

// User Overview Data
app.get('/api/user/overview', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const [orders, transactions, tickets, notifications] = await Promise.all([
      db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId),
      db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId),
      db.prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5').all(userId),
      db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(userId)
    ]);

    res.json({
      user: req.user,
      recentOrders: orders,
      recentTransactions: transactions,
      activeTickets: tickets,
      notifications
    });
  } catch (err) {
    console.error('[User Overview Error]:', err);
    res.status(500).json({ error: 'Failed to load dashboard overview.' });
  }
});

// User Orders
app.get('/api/user/orders', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
    res.json({ orders });
  } catch (err) {
    console.error('[User Orders Error]:', err);
    res.status(500).json({ error: 'Failed to load orders.' });
  }
});

// User Create Order (from CheckoutModal or cart) with Server-Side Price Verification & Auto Invoicing
// Helper to resolve canonical Indian VP package ID
export function resolveIndianVPPackageId(title?: string, productId?: string): string | null {
  const t = (title || '').toLowerCase();
  const p = (productId || '').toLowerCase();
  
  if (p.includes('220000') || t.includes('220,000') || t.includes('220000')) return 'vp-220000';
  if (p.includes('110000') || t.includes('110,000') || t.includes('110000')) return 'vp-110000';
  if (p.includes('66000') || t.includes('66,000') || t.includes('66000')) return 'vp-66000';
  if (p.includes('44000') || t.includes('44,000') || t.includes('44000')) return 'vp-44000';
  if (p.includes('22000') || t.includes('22,000') || t.includes('22000')) return 'vp-22000';
  if (p.includes('14650') || t.includes('14,650') || t.includes('14650')) return 'vp-14650';
  if (p.includes('11000') || t.includes('11,000') || t.includes('11000')) return 'vp-11000';
  if (p.includes('7400') || t.includes('7,400') || t.includes('7400')) return 'vp-7400';
  if (p.includes('5350') || t.includes('5,350') || t.includes('5350')) return 'vp-5350';
  if (p.includes('3650') || t.includes('3,650') || t.includes('3650')) return 'vp-3650';
  if (p.includes('2050') || t.includes('2,050') || t.includes('2050')) return 'vp-2050';
  if (p.includes('1000') || t.includes('1,000') || t.includes('1000')) return 'vp-1000';
  if (p.includes('475') || p.includes('400') || t.includes('475') || t.includes('400')) return 'vp-475';
  
  return null;
}

// Public live stock endpoint for VP packs
app.get('/api/vp-stock', async (req: Request, res: Response): Promise<void> => {
  try {
    const stockRows = await db.prepare(`
      SELECT CASE 
               WHEN package_id LIKE 'in-%' THEN 'vp-' || substr(package_id, 4) 
               ELSE package_id 
             END as package_id,
             SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
             SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued,
             SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
             COUNT(*) as total
      FROM vp_codes
      GROUP BY CASE 
                 WHEN package_id LIKE 'in-%' THEN 'vp-' || substr(package_id, 4) 
                 ELSE package_id 
               END
    `).all();
    res.json({ stock: stockRows });
  } catch (err) {
    console.error('[VP Stock Error]:', err);
    res.status(500).json({ error: 'Failed to load VP stock.' });
  }
});

app.post('/api/user/orders', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isCartOrder = req.body.type === 'cart' || (req.body.title && String(req.body.title).startsWith('Cart Checkout:'));
    let productId = req.body.product_id || req.body.package_id;
    let title = req.body.title || req.body.package_title;
    let amount = req.body.amount !== undefined ? req.body.amount : req.body.amount_inr;
    const currency = req.body.currency || 'INR';
    let type = req.body.type || (isCartOrder ? 'cart' : 'vp');
    const isRankupOrder = type === 'rankup';
    const paymentMethod = req.body.paymentMethod || req.body.payment_method || 'UPI Instant';
    const details = req.body.details || {};

    if (amount !== undefined && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) {
      res.status(400).json({ error: 'Order amount must be a finite non-negative number.' });
      return;
    }
    if (title !== undefined && (typeof title !== 'string' || title.trim().length > 200)) {
      res.status(400).json({ error: 'Order title must be 200 characters or fewer.' });
      return;
    }
    if (typeof title === 'string') title = title.trim();

    // Validate Riot ID if provided in order details
    const orderRiotId = req.body.riot_id || details?.riotId;
    if (orderRiotId && String(orderRiotId).trim()) {
      const riotCheck = await verifyRiotId(String(orderRiotId).trim());
      if (!riotCheck.exists) {
        res.status(400).json({
          error: riotCheck.error || 'The provided Riot ID for this order is not a legitimate Valorant account. Please check your username and tag.'
        });
        return;
      }
      details.riotId = riotCheck.riotId;
      details.riotVerified = Boolean(riotCheck.verified);
    }

    // Server-Side Price Validation against persistent database catalog
    const aliasMap: Record<string, string> = {
        viper: 'vp-475',
        neon: 'vp-1000',
        reyna: 'vp-2050',
        fade: 'vp-3650',
        jett: 'vp-5350',
        iso: 'vp-11000',
        'p-a1023': 'lst_immortal_kuronami',
        'p-a1024': 'lst_radiant_singularity',
        'p-a1025': 'lst_ascendant_prime',
        'p-a1026': 'lst_diamond_daily',
        'spotlight-reyna': 'lst_immortal_kuronami',
      };

    if (isRankupOrder) {
      const quote = details?.rankup;
      if (!quote || typeof quote.fromRankId !== 'string' || typeof quote.toRankId !== 'string' ||
          !['solo', 'duo'].includes(quote.mode) || !['standard', 'priority'].includes(quote.queueType) || productId) {
        res.status(400).json({ error: 'A valid rank progression quote is required.' });
        return;
      }
      const fromIndex = VALORANT_RANKS.findIndex((rank) => rank.id === quote.fromRankId);
      const toIndex = VALORANT_RANKS.findIndex((rank) => rank.id === quote.toRankId);
      if (fromIndex < 0 || toIndex <= fromIndex || toIndex >= VALORANT_RANKS.length) {
        res.status(400).json({ error: 'The selected rank progression is invalid.' });
        return;
      }

      let basePriceINR = 0;
      let deliveryHours = 0;
      for (let index = fromIndex; index < toIndex; index += 1) {
        const tier = VALORANT_RANKS[index];
        const rate = await db.prepare('SELECT price_inr, active, details_json FROM products WHERE id = ? AND category = \'rank_rate\'').get(`rankrate_${tier.id}`) as any;
        if (!rate || !rate.active) {
          res.status(409).json({ error: `The rank-up rate for ${tier.name} is unavailable.` });
          return;
        }
        const storedDetails = JSON.parse(String(rate.details_json || '{}'));
        if (storedDetails.rankId !== tier.id || Number(storedDetails.tierIndex) !== index) {
          res.status(409).json({ error: `The rank-up rate for ${tier.name} is invalid.` });
          return;
        }
        basePriceINR += Number(rate.price_inr);
        deliveryHours += Number(quote.queueType === 'priority' ? storedDetails.priorityDeliveryHours : storedDetails.stdDeliveryHours);
      }

      const expectedAmount = Math.round(basePriceINR * (quote.mode === 'duo' ? 2 : 1) * (quote.queueType === 'priority' ? 1.25 : 1));
      if (!Number.isFinite(Number(amount)) || Math.abs(Number(amount) - expectedAmount) > 0.01) {
        res.status(400).json({ error: `Rank-up price verification failed. Server catalog price is ₹${expectedAmount}.` });
        return;
      }
      amount = expectedAmount;
      title = `Rankup: ${VALORANT_RANKS[fromIndex].name} to ${VALORANT_RANKS[toIndex].name}`;
      details.rankup = {
        fromRankId: quote.fromRankId,
        fromRank: VALORANT_RANKS[fromIndex].name,
        toRankId: quote.toRankId,
        toRank: VALORANT_RANKS[toIndex].name,
        mode: quote.mode,
        queueType: quote.queueType,
        deliveryEstimateHours: deliveryHours,
      };
    }

    if (isCartOrder) {
      const cartItems = details?.cartItems;
      if (!Array.isArray(cartItems) || cartItems.length === 0 || cartItems.length > 50) {
        res.status(400).json({ error: 'Cart checkout requires 1 to 50 catalog-backed items.' });
        return;
      }

      const resolvedCartItems: Array<{ id: string; title: string; quantity: number; unitPriceINR: number }> = [];
      let expectedTotal = 0;
      for (const cartItem of cartItems) {
        const requestedId = typeof cartItem?.id === 'string' ? cartItem.id.trim() : '';
        const quantity = Number(cartItem?.quantity);
        if (!requestedId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
          res.status(400).json({ error: 'Cart item identifiers or quantities are invalid.' });
          return;
        }

        const resolvedId = aliasMap[requestedId] || (requestedId.startsWith('in-') ? `vp-in-${requestedId.slice(3)}` : requestedId);
        const catalogItem = await db.prepare('SELECT id, title, price_inr, active FROM products WHERE id = ?').get(resolvedId) as any;
        if (catalogItem) {
          if (!catalogItem.active) {
            res.status(409).json({ error: 'A cart product is no longer available.' });
            return;
          }
          expectedTotal += Number(catalogItem.price_inr) * quantity;
          resolvedCartItems.push({ id: String(catalogItem.id), title: String(catalogItem.title), quantity, unitPriceINR: Number(catalogItem.price_inr) });
          continue;
        }

        const listing = await db.prepare('SELECT id, title, price_inr, status FROM listings WHERE id = ?').get(resolvedId) as any;
        if (!listing || listing.status !== 'published') {
          res.status(409).json({ error: 'A cart listing is not available for purchase.' });
          return;
        }
        expectedTotal += Number(listing.price_inr) * quantity;
        resolvedCartItems.push({ id: String(listing.id), title: String(listing.title), quantity, unitPriceINR: Number(listing.price_inr) });
      }

      if (!Number.isFinite(Number(amount)) || Math.abs(Number(amount) - expectedTotal) > 0.01) {
        res.status(400).json({ error: `Cart price verification failed. Server catalog total is ₹${expectedTotal}.` });
        return;
      }

      amount = expectedTotal;
      title = `Cart Checkout: ${resolvedCartItems.map((item) => `${item.title} (x${item.quantity})`).join(', ')}`;
      details.cartItems = resolvedCartItems;
    }

    // Service cards historically submitted only a title and a browser price.
    // Resolve exact catalog titles so existing cards keep working, but never
    // accept an arbitrary positive price from a client without a catalog row.
    if (!productId && !isCartOrder && Number(amount) > 0 && typeof title === 'string') {
      const titleMatch = await db.prepare('SELECT id FROM products WHERE title = ? COLLATE NOCASE AND active = 1 LIMIT 1').get(title.trim()) as any;
      if (titleMatch) productId = String(titleMatch.id);
    }

    if (!productId && !isCartOrder && !isRankupOrder && Number(amount) > 0) {
      res.status(400).json({ error: 'Paid orders must match an active server catalog product.' });
      return;
    }

    if (productId && !isCartOrder) {
      const resolvedId = aliasMap[productId] || productId;
      const catalogItem = await db.prepare('SELECT * FROM products WHERE id = ?').get(resolvedId) as any;
      if (catalogItem) {
        if (!catalogItem.active) {
          res.status(409).json({ error: 'This product is no longer available for purchase.' });
          return;
        }
        if (catalogItem.category === 'rental') {
          const rentalDetails = JSON.parse(String(catalogItem.details_json || '{}'));
          if (!rentalDetails.rentalId || !rentalDetails.duration) {
            res.status(409).json({ error: 'This rental catalog entry is incomplete.' });
            return;
          }
          type = 'rental';
          details.rentalProductId = String(rentalDetails.rentalId);
          details.rentalDuration = String(rentalDetails.duration);
        } else if (type === 'rental') {
          res.status(400).json({ error: 'Rental orders must use an active rental catalog product.' });
          return;
        }
        title = catalogItem.title;
        // Verify price:
        if (!isCartOrder) {
          // Direct single catalog item order: price must match catalog exactly
          if (amount !== undefined && Math.abs(Number(amount) - catalogItem.price_inr) > 0.01) {
            res.status(400).json({
              error: `Price verification failed. Server catalog price is ₹${catalogItem.price_inr}, but received ₹${amount}.`
            });
            return;
          }
          amount = catalogItem.price_inr;
        } else {
          // Cart order: if single catalog item matched, verify cart total is not less than the catalog price
          if (amount !== undefined && Number(amount) < catalogItem.price_inr - 0.01) {
            res.status(400).json({
              error: `Price verification failed. Cart total cannot be less than catalog item price ₹${catalogItem.price_inr}.`
            });
            return;
          }
        }
      } else {
        // Fallback: Check if this productId belongs to an account listing
        const listing = await db.prepare('SELECT * FROM listings WHERE id = ?').get(resolvedId) as any;
        if (!listing) {
          res.status(400).json({ error: 'The selected product is not present in the active server catalog.' });
          return;
        }
        if (listing.status !== 'published') {
          res.status(409).json({ error: 'This listing is not available for purchase.' });
          return;
        }
        if (listing) {
          title = listing.title;
          if (!isCartOrder) {
            if (amount !== undefined && Math.abs(Number(amount) - listing.price_inr) > 0.01) {
              res.status(400).json({
                error: `Price verification failed. Server listing price is ₹${listing.price_inr}, but received ₹${amount}.`
              });
              return;
            }
            amount = listing.price_inr;
          } else {
            if (amount !== undefined && Number(amount) < listing.price_inr - 0.01) {
              res.status(400).json({
                error: `Price verification failed. Cart total cannot be less than listing price ₹${listing.price_inr}.`
              });
              return;
            }
          }
        }
      }
    }

    if (!title || amount === undefined || !Number.isFinite(Number(amount)) || Number(amount) < 0) {
      res.status(400).json({ error: 'Valid title and price are required for order creation.' });
      return;
    }

    const orderId = 'ord_' + crypto.randomBytes(6).toString('hex');
    const txnId = 'txn_' + crypto.randomBytes(6).toString('hex');
    const refNo = 'VIB-' + Date.now().toString(36).toUpperCase();
    const now = new Date().toISOString();

    const baseTimeline = [
      { status: 'AWAITING_PAYMENT', timestamp: now, note: 'Order placed by customer. Manual payment instructions issued.', actor: req.user!.name }
    ];

    // Indian VP Automated Inventory: Reserve genuine code atomically upon order placement
    const isRegionalVPOrder = (title || '').toLowerCase().includes('php') || (title || '').toLowerCase().includes('philippines') || (title || '').toLowerCase().includes('malaysia') || (title || '').toLowerCase().includes('singapore') || type === 'regional_vp';
    const isIndianVPOrder = (type === 'vp' || (title || '').toLowerCase().includes('vp') || (title || '').toLowerCase().includes('valorant points')) && !isRegionalVPOrder;
    const targetPkgId = isIndianVPOrder ? resolveIndianVPPackageId(title, productId) : null;
    const finalAmount = Number(amount);
    const subtotal = Math.round((finalAmount / 1.18) * 100) / 100;
    const taxAmount = Math.round((finalAmount - subtotal) * 100) / 100;

    const invoiceId = await db.transaction(async (tx) => {
      const orderTimeline = [...baseTimeline];
      if (targetPkgId) {
        const reservedCodeRow = await tx.prepare(`
          SELECT id, code, package_id FROM vp_codes
          WHERE (package_id = ? OR package_id = ?) AND status = 'available'
          LIMIT 1
        `).get(targetPkgId, targetPkgId.replace('vp-', 'in-')) as any;

        if (reservedCodeRow) {
          orderTimeline.push({
            status: 'AWAITING_PAYMENT',
            timestamp: now,
            note: 'Genuine Valorant prepaid code reserved from automated vault inventory.',
            actor: 'system'
          });
          await tx.prepare(`
            UPDATE vp_codes SET status = 'reserved', order_id = ? WHERE id = ?
          `).run(orderId, reservedCodeRow.id);
        }
      }

      await tx.prepare(`
        INSERT INTO orders (
          id, user_id, type, title, amount, currency, status, payment_status, fulfillment_status,
          payment_method, details_json, timeline_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'processing', 'AWAITING_PAYMENT', 'PENDING', ?, ?, ?, ?, ?)
      `).run(
        orderId,
        req.user!.id,
        type,
        title,
        finalAmount,
        currency,
        paymentMethod,
        JSON.stringify(details),
        JSON.stringify(orderTimeline),
        now,
        now
      );

      await tx.prepare(`
        INSERT INTO transactions (id, user_id, order_id, type, amount, currency, status, reference_no, created_at)
        VALUES (?, ?, ?, 'payment', ?, ?, 'pending', ?, ?)
      `).run(
        txnId,
        req.user!.id,
        orderId,
        finalAmount,
        currency,
        refNo,
        now
      );

      // Increment profile orders
      await tx.prepare(`
        UPDATE profiles SET total_orders = (
          SELECT COUNT(*) FROM orders WHERE user_id = ?
        ) WHERE user_id = ?
      `).run(req.user!.id, req.user!.id);

      // Auto-generate Sequential Invoice (GST / Accounting Compliant)
      const generatedInvoiceId = await generateNextInvoiceId(tx);

      await tx.prepare(`
        INSERT INTO invoices (
          id, order_id, customer_id, customer_name, customer_email, customer_phone,
          billing_address, seller_name, product_name, description, quantity,
          unit_price, subtotal, platform_fee, tax_amount, discount_amount, final_total,
          currency, status, payment_method, payment_reference, notes, invoice_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, ?, 0, ?, ?, 'pending', ?, ?, ?, ?, ?)
      `).run(
        generatedInvoiceId,
        orderId,
        req.user!.id,
        req.user!.name,
        req.user!.email,
        req.user!.phone || '',
        'India',
        'VIB Official Store',
        title,
        `VIB Digital Services: ${title}. Protected through middleman escrow.`,
        finalAmount,
        subtotal,
        taxAmount,
        finalAmount,
        currency,
        paymentMethod,
        refNo,
        'Tax invoice generated automatically upon order fulfillment. GST at 18% included.',
        now,
        now
      );

      // Create Initial Order Room Message
      await tx.prepare(`
        INSERT INTO order_messages (id, order_id, sender_id, sender_name, sender_role, message, flagged, created_at)
        VALUES (?, ?, 'system', 'VIB Dispatch System', 'system', ?, 0, ?)
      `).run(
        'msg_' + crypto.randomBytes(6).toString('hex'),
        orderId,
        `Order room initialized for #${orderId} (${title}). All deliveries, game account credentials, and communications are secured under official VIB middleman escrow. Please keep all communication inside this order room.`,
        now
      );

      // Send confirmation notification
      await tx.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
        VALUES (?, ?, ?, ?, 'order', 0, ?)
      `).run(
        'notif_' + crypto.randomBytes(8).toString('hex'),
        req.user!.id,
        `Order Received: ${title}`,
        `Your order #${orderId} for ${currency} ${amount} is currently awaiting payment verification. Invoice #${generatedInvoiceId} generated.`,
        now
      );

      return generatedInvoiceId;
    });

    // Dispatch automated confirmation & admin notifications via server/email.ts
    sendOrderPendingVerificationEmail({
      id: orderId,
      user_email: req.user!.email,
      title,
      amount: finalAmount,
      currency,
      type,
      details,
      payment_evidence_ref: details.utr || null
    }).catch((e) => console.warn('[Order Email Dispatch Warning]:', e));

    res.status(201).json({
      message: 'Order created successfully!',
      orderId,
      invoiceId,
      order: {
        id: orderId,
        title,
        amount: finalAmount,
        currency,
        type,
        details,
        status: 'processing',
        payment_status: 'AWAITING_PAYMENT',
        fulfillment_status: 'PENDING',
        referenceNo: refNo
      },
      referenceNo: refNo
    });
  } catch (err: any) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to create order.' });
  }
});

// ==========================================
// ORDER ROOM & CHAT (UNIVERSAL ORDER FLOW)
// ==========================================

// Get Order Room Details, Timeline & Messages
app.get('/api/orders/:id/room', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id;
    const order = await db.prepare(`
      SELECT o.*, u.name as buyer_name, u.email as buyer_email, u.riot_id as buyer_riot_id
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order) {
      res.status(404).json({ error: 'Order room not found.' });
      return;
    }

    // Security: Customer can only access their own order, staff/admin can access any order
    const isOwner = order.user_id === req.user!.id;
    const isStaff = ['admin', 'superadmin', 'moderator'].includes(req.user!.role);
    if (!isOwner && !isStaff) {
      res.status(403).json({ error: 'Access denied: You are not authorized to view this order room.' });
      return;
    }

    const messages = await db.prepare(`
      SELECT * FROM order_messages WHERE order_id = ? ORDER BY created_at ASC
    `).all(orderId);

    const paymentVerified = ['PAYMENT_VERIFIED', 'PAID', 'COMPLETED'].includes(String(order.payment_status || '').toUpperCase()) || order.status === 'completed';
    const verificationAdvanced = Boolean(
      paymentVerified ||
      ['SUBMITTED_FOR_VERIFICATION'].includes(String(order.payment_status || '').toUpperCase()) ||
      ['processing', 'completed'].includes(String(order.status || '').toLowerCase())
    );

    res.json({
      order: { id: order.id, ...order },
      stages: [
        { key: 'placed', label: 'Payment Confirmed', completed: paymentVerified },
        { key: 'verifying', label: 'Verification & Review', completed: verificationAdvanced },
        { key: 'fulfillment', label: 'Order Room Processing', completed: order.status === 'processing' || order.status === 'completed' },
        { key: 'completed', label: 'Delivered & Completed', completed: order.status === 'completed' }
      ],
      orderRoom: {
        orderId: order.id,
        title: order.title,
        type: order.type,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        payment_status: order.payment_status,
        payment_evidence_ref: order.payment_evidence_ref,
        payment_evidence_image: order.payment_evidence_image,
        fulfillment_notes: order.fulfillment_notes || order.issued_code,
        issued_code: order.issued_code,
        delivery_data: (() => {
          if (!order.delivery_data_json) return null;
          try { return JSON.parse(order.delivery_data_json); } catch { return null; }
        })(),
        paymentMethod: order.payment_method,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        buyer: {
          name: order.buyer_name,
          email: order.buyer_email,
          riotId: order.buyer_riot_id
        },
        details: (() => {
          if (!order.details_json) return {};
          try { return JSON.parse(order.details_json); } catch { return {}; }
        })(),
        messages
      }
    });
  } catch (err) {
    console.error('[Order Room Fetch Error]:', err);
    res.status(500).json({ error: 'Failed to load order room.' });
  }
});

// Post Message in Order Room (with Anti-Fraud Detection)
app.post('/api/orders/:id/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id;
    const { message, attachmentUrl } = req.body;

    if (!message || !String(message).trim()) {
      res.status(400).json({ error: 'Message text cannot be empty.' });
      return;
    }

    const order = await db.prepare('SELECT user_id FROM orders WHERE id = ?').get(orderId) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const isOwner = order.user_id === req.user!.id;
    const isStaff = ['admin', 'superadmin', 'moderator'].includes(req.user!.role);
    if (!isOwner && !isStaff) {
      res.status(403).json({ error: 'Access denied to this order room.' });
      return;
    }

    // Run Anti-Fraud Scanner (only for non-staff customers)
    const scanResult = !isStaff ? scanMessageForAntiFraud(String(message)) : { flagged: false, reason: null };
    const msgId = 'msg_' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();
    const senderRole = isStaff ? 'admin' : (req.user!.role || 'user');
    const senderName = isStaff ? (req.user!.name ? `${req.user!.name} (VIB Support)` : 'VIB Support Desk') : req.user!.name;

    await db.prepare(`
      INSERT INTO order_messages (id, order_id, sender_id, sender_name, sender_role, message, attachment_url, flagged, flag_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msgId,
      orderId,
      req.user!.id,
      senderName,
      senderRole,
      String(message).trim(),
      attachmentUrl || null,
      scanResult.flagged ? 1 : 0,
      scanResult.reason || null,
      now
    );

    // If flagged, log audit warning
    if (scanResult.flagged) {
      await logAudit(
        req.user!.id,
        req.user!.name,
        'ANTI_FRAUD_TRIGGER',
        'chat_message',
        msgId,
        { orderId, reason: scanResult.reason, snippet: String(message).slice(0, 50) },
        req.ip || '127.0.0.1'
      );
    }

    const msgRow = {
      id: msgId,
      order_id: orderId,
      sender_id: req.user!.id,
      sender_name: req.user!.name,
      sender_role: req.user!.role,
      message: String(message).trim(),
      attachment_url: attachmentUrl || null,
      flagged: scanResult.flagged ? 1 : 0,
      flag_reason: scanResult.reason || null,
      created_at: now
    };

    res.status(201).json({
      message: msgRow,
      messageId: msgId,
      flagged: scanResult.flagged ? 1 : 0,
      flagReason: scanResult.reason,
      warning: scanResult.flagged ? scanResult.reason : null
    });
  } catch (err) {
    console.error('[Order Message Error]:', err);
    res.status(500).json({ error: 'Failed to send order message.' });
  }
});

// ==========================================
// INVOICES & BILLING ROUTES
// ==========================================

// Get Invoices for Authenticated Customer
app.get('/api/user/invoices', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoices = await db.prepare('SELECT * FROM invoices WHERE customer_id = ? ORDER BY invoice_date DESC').all(req.user!.id);
    res.json({ invoices });
  } catch (err) {
    console.error('[User Invoices Error]:', err);
    res.status(500).json({ error: 'Failed to load invoices.' });
  }
});

// Get Single Invoice Details (Customer or Staff)
app.get('/api/invoices/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoice = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as any;
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    const isOwner = invoice.customer_id === req.user!.id;
    const isStaff = ['admin', 'superadmin', 'moderator'].includes(req.user!.role);
    if (!isOwner && !isStaff) {
      res.status(403).json({ error: 'Access denied: You are not authorized to view this invoice.' });
      return;
    }

    res.json({ invoice });
  } catch (err) {
    console.error('[Get Invoice Error]:', err);
    res.status(500).json({ error: 'Failed to load invoice.' });
  }
});

// User Transactions
app.get('/api/user/transactions', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transactions = await db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
    res.json({ transactions });
  } catch (err) {
    console.error('[User Transactions Error]:', err);
    res.status(500).json({ error: 'Failed to load transactions.' });
  }
});


// VIB Escrow Trade Desk Ticket Initiation
app.post('/api/escrow/tickets', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tradeType, counterparty, weaponOrSkin, skinVariant, region, amount, contactEmail } = req.body;
    const normalizedTradeType = typeof tradeType === 'string' ? tradeType.trim().toLowerCase() : '';
    const normalizedCounterparty = typeof counterparty === 'string' ? counterparty.trim() : '';
    const normalizedItem = typeof weaponOrSkin === 'string' ? weaponOrSkin.trim() : '';
    const normalizedRegion = typeof region === 'string' ? region.trim() : 'India (MUM)';
    const amountValue = typeof amount === 'number' ? amount : Number(String(amount ?? '').replace(/[₹,\s]/g, ''));
    const normalizedEmail = typeof contactEmail === 'string' ? contactEmail.trim() : '';
    const regions = ['India (MUM)', 'Philippines (PHP)', 'Asia Pacific (AP)', 'North America (NA)', 'Europe (EU)'];
    if (!['buy', 'sell', 'swap'].includes(normalizedTradeType) || !normalizedCounterparty || !normalizedItem ||
        !Number.isFinite(amountValue) || amountValue <= 0 || amountValue > 10_000_000 || !regions.includes(normalizedRegion) ||
        (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))) {
      res.status(400).json({ error: 'Enter a valid trade type, counterparty, item, region, positive trade value, and contact email.' });
      return;
    }

    const userId = req.user!.id;
    const userName = req.user!.name;

    const ticketId = 'escrow_' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();
    const subject = `[Escrow Trade] ${normalizedTradeType.toUpperCase()} - ${normalizedItem} (₹${amountValue})`;
    const detailMessage = `Trade Type: ${String(tradeType).toUpperCase()}
Counterparty: ${normalizedCounterparty}
Item/Skin: ${normalizedItem}
Variant/Tier: ${skinVariant || 'Standard'}
Target Region: ${normalizedRegion}
Valuation: ₹${amountValue}
Contact: ${normalizedEmail || req.user!.email}`;

    const initialMessages = JSON.stringify([
      { sender: 'user', senderName: userName, text: detailMessage, time: now },
      { sender: 'system', senderName: 'VIB Escrow Desk', text: 'Your request was received and is waiting for staff review. Do not share account passwords or other credentials in this ticket.', time: now }
    ]);

    await db.transaction(async (tx) => {
      await tx.prepare(`
        INSERT INTO support_tickets (id, user_id, subject, category, status, priority, messages_json, created_at, updated_at)
        VALUES (?, ?, ?, 'trade_escrow', 'open', 'high', ?, ?, ?)
      `).run(ticketId, userId, subject, initialMessages, now, now);

      await tx.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
        VALUES (?, ?, ?, ?, 'order', 0, ?)
      `).run(
        'notif_' + crypto.randomBytes(8).toString('hex'),
        userId,
        `Escrow request received: #${ticketId}`,
        'Your escrow request is linked to your support dashboard and is waiting for staff review.',
        now
      );

      await logAudit(userId, userName, 'CREATE_ESCROW_TICKET', 'support_ticket', ticketId, { tradeType: normalizedTradeType, amount: amountValue }, req.ip || '127.0.0.1', tx);
    });

    res.status(201).json({
      message: 'Escrow request received and linked to your account for staff review.',
      ticketId,
      ticket: { id: ticketId, subject, status: 'open', category: 'trade_escrow' }
    });
  } catch (err: any) {
    console.error('Escrow ticket error:', err);
    res.status(500).json({ error: 'Server error processing escrow ticket.' });
  }
});

// User Tickets
app.get('/api/user/tickets', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tickets = await db.prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY updated_at DESC').all(req.user!.id);
    res.json({ tickets });
  } catch (err) {
    console.error('[User Tickets Error]:', err);
    res.status(500).json({ error: 'Failed to load support tickets.' });
  }
});

app.post('/api/user/tickets', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, category, message, priority, order_id } = req.body;
    const subjectText = typeof subject === 'string' ? subject.trim() : '';
    const messageText = typeof message === 'string' ? message.trim() : '';
    const categoryValue = typeof category === 'string' ? category.trim() : (order_id ? 'order' : 'general');
    const priorityValue = typeof priority === 'string' ? priority.trim().toLowerCase() : 'medium';
    if (subjectText.length < 3 || subjectText.length > 200 || !messageText || messageText.length > 4000 ||
        !['orders', 'disputes', 'payment', 'account', 'general', 'order'].includes(categoryValue) ||
        !['low', 'medium', 'high'].includes(priorityValue)) {
      res.status(400).json({ error: 'Enter a subject (3–200 characters), a message (1–4000 characters), valid category, and valid priority.' });
      return;
    }
    const ticketId = 'tkt_' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();
    const initialMessages = JSON.stringify([
      { sender: 'user', senderName: req.user!.name, text: messageText, time: now }
    ]);

    try {
      await db.transaction(async (tx) => {
        await tx.prepare(`
          INSERT INTO support_tickets (id, user_id, subject, category, status, priority, messages_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?)
        `).run(
          ticketId,
          req.user!.id,
          subjectText,
          categoryValue,
          priorityValue,
          initialMessages,
          now,
          now
        );
        const staffUsers = await tx.prepare("SELECT id FROM users WHERE status = 'active' AND role IN ('admin', 'moderator')").all() as Array<{ id: string }>;
        for (const staffUser of staffUsers) {
          await tx.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
            VALUES (?, ?, ?, ?, 'info', 0, ?)
          `).run(
            'notif_' + crypto.randomBytes(8).toString('hex'),
            staffUser.id,
            'New customer support ticket',
            `A customer opened ticket #${ticketId}.`,
            now
          );
        }
        await logAudit(req.user!.id, req.user!.name, 'CREATE_SUPPORT_TICKET', 'support_ticket', ticketId, { category: categoryValue, priority: priorityValue }, req.ip || '127.0.0.1', tx);
      });
    } catch (error) {
      console.error('Failed to persist support ticket:', error);
      res.status(500).json({ error: 'Could not create your support ticket. Please retry.' });
      return;
    }

    res.status(201).json({
      message: 'Support ticket submitted.',
      ticketId,
      ticket: { id: ticketId, subject: subjectText, status: 'open' }
    });
  } catch (err) {
    console.error('[Create Ticket Error]:', err);
    res.status(500).json({ error: 'Failed to submit support ticket.' });
  }
});

app.post('/api/user/tickets/:id/reply', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const text = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!text || text.length > 4000) {
      res.status(400).json({ error: 'Reply must contain between 1 and 4000 characters.' });
      return;
    }

    const ticket = await db.prepare('SELECT * FROM support_tickets WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
    if (!ticket) {
      res.status(404).json({ error: 'Support ticket not found.' });
      return;
    }
    if (!['open', 'in_progress'].includes(ticket.status)) {
      res.status(409).json({ error: 'This support ticket is resolved and can no longer receive replies.' });
      return;
    }

    let messages: any[];
    try {
      messages = JSON.parse(ticket.messages_json || '[]');
      if (!Array.isArray(messages)) messages = [];
    } catch {
      res.status(409).json({ error: 'This support ticket has invalid message history and cannot accept replies.' });
      return;
    }
    const now = new Date().toISOString();
    messages.push({ sender: 'user', senderName: req.user!.name, text, time: now });
    try {
      await db.transaction(async (tx) => {
        await tx.prepare('UPDATE support_tickets SET messages_json = ?, updated_at = ? WHERE id = ? AND user_id = ?')
          .run(JSON.stringify(messages), now, ticket.id, req.user!.id);
        const staffUsers = await tx.prepare("SELECT id FROM users WHERE status = 'active' AND role IN ('admin', 'moderator')").all() as Array<{ id: string }>;
        for (const staffUser of staffUsers) {
          await tx.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
            VALUES (?, ?, ?, ?, 'info', 0, ?)
          `).run(
            'notif_' + crypto.randomBytes(8).toString('hex'),
            staffUser.id,
            'New customer support reply',
            `A customer replied to ticket #${ticket.id}.`,
            now
          );
        }
        await logAudit(req.user!.id, req.user!.name, 'USER_REPLY_TICKET', 'support_ticket', ticket.id, { messageLength: text.length }, req.ip || '127.0.0.1', tx);
      });
    } catch (error) {
      console.error('Failed to persist support ticket reply:', error);
      res.status(500).json({ error: 'Could not save your support reply. Please retry.' });
      return;
    }

    res.json({ message: 'Reply added to your support ticket.', ticket: { id: ticket.id, status: ticket.status, messages_json: JSON.stringify(messages), updated_at: now } });
  } catch (err) {
    console.error('[Ticket Reply Error]:', err);
    res.status(500).json({ error: 'Failed to reply to ticket.' });
  }
});

// Update Profile
app.put('/api/user/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, bio, phone, riot_id, discord_tag } = req.body;
    const now = new Date().toISOString();

    const nameValue = name == null ? '' : String(name).trim();
    const phoneValue = phone == null ? '' : String(phone).trim();
    const bioValue = bio == null ? '' : String(bio).trim();
    const discordValue = discord_tag == null ? '' : String(discord_tag).trim();
    if (nameValue.length < 2 || nameValue.length > 80) {
      res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
      return;
    }
    if (phoneValue && (phoneValue.length > 32 || !/^[+()\d\s.-]{7,32}$/.test(phoneValue))) {
      res.status(400).json({ error: 'Please provide a valid phone or WhatsApp number.' });
      return;
    }
    if (bioValue.length > 1000) {
      res.status(400).json({ error: 'Bio must be 1000 characters or fewer.' });
      return;
    }
    if (discordValue.length > 100) {
      res.status(400).json({ error: 'Discord tag must be 100 characters or fewer.' });
      return;
    }

    const existingUser = await db.prepare('SELECT riot_id, riot_verified FROM users WHERE id = ?').get(req.user!.id) as any;
    const riotIdProvided = Object.prototype.hasOwnProperty.call(req.body, 'riot_id');

    let verifiedRiotId: string | null = null;
    let isRiotVerified = existingUser?.riot_verified || 0;

    if (!riotIdProvided) {
      verifiedRiotId = existingUser?.riot_id || null;
    } else if (riot_id && String(riot_id).trim()) {
      const normalizedRiotId = String(riot_id).trim();
      if (normalizedRiotId.toLowerCase() === String(existingUser?.riot_id || '').trim().toLowerCase()) {
        verifiedRiotId = existingUser.riot_id;
      } else {
        const riotCheck = await verifyRiotId(normalizedRiotId);
        if (!riotCheck.exists) {
          res.status(400).json({
            error: riotCheck.error || 'The provided Riot ID is not a legitimate Valorant account. Please check your username and tag.'
          });
          return;
        }
        verifiedRiotId = riotCheck.riotId;
        isRiotVerified = riotCheck.verified ? 1 : 0;
      }
    } else if (riotIdProvided) {
      verifiedRiotId = null;
      isRiotVerified = 0;
    }

    if (nameValue) {
      await db.prepare('UPDATE users SET name = ?, phone = ?, riot_id = ?, riot_verified = ?, updated_at = ? WHERE id = ?')
        .run(nameValue, phoneValue || null, verifiedRiotId, isRiotVerified, now, req.user!.id);
    } else {
      await db.prepare('UPDATE users SET phone = ?, riot_id = ?, riot_verified = ?, updated_at = ? WHERE id = ?')
        .run(phoneValue || null, verifiedRiotId, isRiotVerified, now, req.user!.id);
    }

    await db.prepare('UPDATE profiles SET bio = ?, discord_tag = ? WHERE user_id = ?')
      .run(bioValue || null, discordValue || null, req.user!.id);

    const updatedUser = await db.prepare(`
      SELECT u.id, u.email, u.name, u.phone, u.riot_id, u.riot_verified, u.role, u.status, u.email_verified,
             p.bio, p.avatar, p.discord_tag, p.wallet_balance, p.kyc_status,
             COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id), 0) AS total_orders
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?
    `).get(req.user!.id);

    res.json({ message: 'Profile updated successfully.', user: updatedUser });
  } catch (err) {
    console.error('[Profile Update Error]:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Notifications
app.get('/api/user/notifications', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
    res.json({ notifications });
  } catch (err) {
    console.error('[Notifications List Error]:', err);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

app.put('/api/user/notifications/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[Mark Notification Read Error]:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// ==========================================
// ADMIN DASHBOARD ROUTES
// ==========================================

// Role authorization matrix (P1-F1/F2/F3):
// - staffOnly     → operational work: admin / superadmin / moderator
// - adminOnly     → sensitive areas (users, finance, staff, payment settings,
//                   audit, delete asset, invoices admin, skins sync): admin / superadmin ONLY
// - superAdminOnly → role/privilege management: superadmin ONLY
const staffOnly = requireRole(['admin', 'superadmin', 'moderator']);
const adminOnly = requireRole(['admin', 'superadmin']);
const superAdminOnly = requireRole(['superadmin']);

// 1. Admin Stats & Analytics
const getAdminStatsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsersRow,
      totalOrdersRow,
      completedOrdersRow,
      grossRevenueRow,
      openDisputesRow,
      activeSellersRow,
      totalListingsRow,
      totalInvoicesRow,
      totalTasksRow,
      pendingVerificationsRow
    ] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM users').get() as Promise<any>,
      db.prepare('SELECT COUNT(*) as count FROM orders').get() as Promise<any>,
      db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").get() as Promise<any>,
      db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE payment_status = 'PAYMENT_VERIFIED' OR status = 'completed'").get() as Promise<any>,
      db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open' OR status = 'in_progress'").get() as Promise<any>,
      db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'seller' AND status = 'active'").get() as Promise<any>,
      db.prepare("SELECT COUNT(*) as count FROM listings").get() as Promise<any>,
      db.prepare("SELECT COUNT(*) as count FROM invoices").get() as Promise<any>,
      db.prepare("SELECT COUNT(*) as count FROM staff_tasks").get() as Promise<any>,
      db.prepare("SELECT COUNT(*) as count FROM orders WHERE payment_status = 'SUBMITTED_FOR_VERIFICATION'").get() as Promise<any>
    ]);

    const persistence = getPersistenceInfo();
    const data = {
      totalUsers: totalUsersRow?.count || 0,
      totalOrders: totalOrdersRow?.count || 0,
      completedOrders: completedOrdersRow?.count || 0,
      // Moderators can work order queues, but must not receive financial totals.
      grossRevenue: req.user?.role === 'moderator' ? undefined : (grossRevenueRow?.total || 0),
      openDisputes: openDisputesRow?.count || 0,
      activeSellers: activeSellersRow?.count || 0,
      totalListings: totalListingsRow?.count || 0,
      totalInvoices: totalInvoicesRow?.count || 0,
      totalTasks: totalTasksRow?.count || 0,
      pendingVerifications: pendingVerificationsRow?.count || 0,
      persistence,
    };

    res.json({
      metrics: data,
      persistence,
      ...data
    });
  } catch (err) {
    console.error('[Admin Stats Error]:', err);
    res.status(500).json({ error: 'Failed to load admin stats.' });
  }
};

app.get('/api/admin/stats', authenticate, staffOnly, getAdminStatsHandler);
app.get('/api/admin/metrics', authenticate, staffOnly, getAdminStatsHandler);

// 2. Admin Users Management
app.get('/api/admin/users', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, role, status } = req.query;
    let query = `
      SELECT u.id, u.email, u.name, u.phone, u.riot_id, u.role, u.status, u.email_verified, u.created_at,
             p.wallet_balance, p.kyc_status,
             COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id), 0) AS total_orders
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.riot_id LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (role) {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    if (status) {
      query += ` AND u.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY u.created_at DESC LIMIT 50`;

    const users = await db.prepare(query).all(...params);
    res.json({ users });
  } catch (err) {
    console.error('[Admin Users List Error]:', err);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

// 3. Admin Update User Status (Suspend/Ban/Activate)
app.put('/api/admin/users/:id/status', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, reason } = req.body;
    const targetId = req.params.id;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      res.status(400).json({ error: 'Invalid status.' });
      return;
    }

    const targetUser = await db.prepare('SELECT role, email FROM users WHERE id = ?').get(targetId) as any;
    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Prevent ordinary admin from modifying superadmin
    if (targetUser.role === 'superadmin' && req.user!.role !== 'superadmin') {
      res.status(403).json({ error: 'Only Superadmin can modify another Superadmin.' });
      return;
    }

    await db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), targetId);

    // If banned or suspended, invalidate all active sessions
    if (status !== 'active') {
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);
    }

    await logAudit(req.user!.id, req.user!.name, 'UPDATE_USER_STATUS', 'user', targetId, { newStatus: status, reason }, req.ip || '127.0.0.1');

    res.json({ message: `User status updated to ${status}.` });
  } catch (err) {
    console.error('[Update User Status Error]:', err);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

// 4. Super Admin Role Management
app.put('/api/admin/users/:id/role', authenticate, superAdminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    const targetId = req.params.id;
    const callerRole = req.user!.role;

    if (!['user', 'seller', 'moderator', 'admin', 'superadmin'].includes(role)) {
      res.status(400).json({ error: 'Invalid role.' });
      return;
    }

    // P1-F7: only a superadmin may grant or demote a superadmin.
    if (role === 'superadmin' && callerRole !== 'superadmin') {
      res.status(403).json({ error: 'Only Superadmin can grant the superadmin role.' });
      return;
    }

    const targetUser = await db.prepare('SELECT id, role FROM users WHERE id = ?').get(targetId) as any;
    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // P1-F7: only a superadmin may change another superadmin's role.
    if (targetUser.role === 'superadmin' && callerRole !== 'superadmin') {
      res.status(403).json({ error: 'Only Superadmin can modify another Superadmin.' });
      return;
    }

    // Prevent a superadmin from self-demoting (avoid removing the last superadmin).
    if (targetUser.id === req.user!.id && callerRole === 'superadmin' && role !== 'superadmin') {
      res.status(400).json({ error: 'Cannot demote yourself.' });
      return;
    }

    await db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, new Date().toISOString(), targetId);

    await logAudit(req.user!.id, req.user!.name, 'UPDATE_USER_ROLE', 'user', targetId, { newRole: role }, req.ip || '127.0.0.1');

    res.json({ message: `User role elevated/changed to ${role}.` });
  } catch (err) {
    console.error('[Update User Role Error]:', err);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// Staff List with Granular Permissions (Admin / SuperAdmin)
app.get('/api/admin/staff', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staffMembers = await db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.updated_at,
             sp.permissions_json, sp.assigned_by
      FROM users u
      LEFT JOIN staff_permissions sp ON u.id = sp.user_id
      WHERE u.role IN ('admin', 'superadmin', 'moderator', 'staff')
      ORDER BY u.created_at DESC
    `).all() as any[];

    const formatted = staffMembers.map(s => {
      let permissions: string[] = s.role === 'superadmin'
        ? ['analytics', 'orders', 'inventory', 'listings', 'auctions', 'rentals', 'invoices', 'finance', 'users', 'support', 'tasks', 'settings']
        : [];
      if (s.permissions_json) {
        try {
          permissions = JSON.parse(s.permissions_json);
        } catch {}
      }
      return {
        ...s,
        permissions
      };
    });

    res.json({ staff: formatted });
  } catch (err: any) {
    console.error('Fetch staff error:', err);
    res.status(500).json({ error: 'Failed to retrieve staff accounts.' });
  }
});

// Create New Staff Account (SuperAdmin Only)
app.post('/api/admin/staff', authenticate, superAdminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role = 'moderator', permissions = [] } = req.body || {};

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and initial password are required.' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters in length.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const userId = 'usr_staff_' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();
    const permsJson = JSON.stringify(Array.isArray(permissions) ? permissions : []);

    await db.transaction(async (tx) => {
      await tx.prepare(`
        INSERT INTO users (id, name, email, password_hash, salt, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(userId, name.trim(), cleanEmail, hash, salt, role, now, now);

      await tx.prepare(`
        INSERT INTO staff_permissions (user_id, permissions_json, assigned_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          permissions_json = excluded.permissions_json,
          assigned_by = excluded.assigned_by,
          updated_at = excluded.updated_at
      `).run(userId, permsJson, req.user!.name, now, now);

      await logAudit(req.user!.id, req.user!.name, 'CREATE_STAFF_ACCOUNT', 'users', userId, {
        name,
        email: cleanEmail,
        role,
        permissions
      }, req, tx);
    });

    res.status(201).json({
      message: 'Staff account created successfully.',
      staff: { id: userId, name: name.trim(), email: cleanEmail, role, permissions }
    });
  } catch (err: any) {
    console.error('Create staff error:', err);
    res.status(500).json({ error: 'Failed to create staff account.' });
  }
});

// Update Staff Permissions (SuperAdmin Only)
app.put('/api/admin/staff/:id/permissions', authenticate, superAdminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staffId = req.params.id;
    const { permissions = [] } = req.body || {};

    const targetUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(staffId) as any;
    if (!targetUser) {
      res.status(404).json({ error: 'Staff account not found.' });
      return;
    }

    const now = new Date().toISOString();
    const permsJson = JSON.stringify(Array.isArray(permissions) ? permissions : []);

    await db.prepare(`
      INSERT INTO staff_permissions (user_id, permissions_json, assigned_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        permissions_json = excluded.permissions_json,
        assigned_by = excluded.assigned_by,
        updated_at = excluded.updated_at
    `).run(staffId, permsJson, req.user!.name, now, now);

    await logAudit(req.user!.id, req.user!.name, 'UPDATE_STAFF_PERMISSIONS', 'users', staffId, { permissions }, req);

    res.json({ message: 'Staff permissions updated successfully.', permissions });
  } catch (err: any) {
    console.error('Update permissions error:', err);
    res.status(500).json({ error: 'Failed to update staff permissions.' });
  }
});

// 5. Admin Orders Management
app.get('/api/admin/orders', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await db.prepare(`
      SELECT o.*, u.email as user_email, u.name as user_name, u.riot_id as user_riot_id
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 100
    `).all();

    res.json({ orders });
  } catch (err) {
    console.error('[Admin Orders List Error]:', err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

const updateOrderStatusHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, note, admin_notes } = req.body;
    const orderId = req.params.id;
    const finalNote = note || admin_notes;

    if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid order status. Allowed: pending, processing, completed, cancelled.' });
      return;
    }

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (status === 'completed' && order.payment_status !== 'PAYMENT_VERIFIED') {
      res.status(409).json({ error: 'Payment must be verified before an order can be completed.' });
      return;
    }

    const now = new Date().toISOString();
    let timeline = [];
    try { timeline = order.timeline_json ? JSON.parse(order.timeline_json) : []; } catch {}
    timeline.push({
      status: status.toUpperCase(),
      timestamp: now,
      note: finalNote || `Status updated to ${status.toUpperCase()} by ${req.user!.name}.`,
      actor: req.user!.name
    });

    const fulfillmentStatus = status === 'completed' ? 'COMPLETED' : status === 'cancelled' ? 'CANCELLED' : order.fulfillment_status || 'PROCESSING';
    const paymentStatus = status === 'completed' ? 'PAYMENT_VERIFIED' : status === 'cancelled' ? 'CANCELLED' : order.payment_status;

    try {
      await db.transaction(async (tx) => {
        await tx.prepare(`
          UPDATE orders SET
            status = ?,
            fulfillment_status = ?,
            payment_status = ?,
            admin_notes = COALESCE(?, admin_notes),
            timeline_json = ?,
            updated_at = ?
          WHERE id = ?
        `).run(status, fulfillmentStatus, paymentStatus, finalNote || null, JSON.stringify(timeline), now, orderId);

        if (status === 'completed') {
          await tx.prepare("UPDATE transactions SET status = 'success' WHERE order_id = ?").run(orderId);
          await tx.prepare("UPDATE invoices SET status = 'paid' WHERE order_id = ?").run(orderId);
          await tx.prepare(`
          UPDATE profiles SET total_orders = (
              SELECT COUNT(*) FROM orders WHERE user_id = ?
            ) WHERE user_id = ?
          `).run(order.user_id, order.user_id);
        } else if (status === 'cancelled') {
          await tx.prepare("UPDATE transactions SET status = 'cancelled' WHERE order_id = ?").run(orderId);
          await tx.prepare("UPDATE invoices SET status = 'cancelled' WHERE order_id = ?").run(orderId);
          await tx.prepare("UPDATE vp_codes SET status = 'available', order_id = NULL WHERE order_id = ? AND status = 'reserved'").run(orderId);
          await tx.prepare(`
          UPDATE profiles SET total_orders = (
              SELECT COUNT(*) FROM orders WHERE user_id = ?
            ) WHERE user_id = ?
          `).run(order.user_id, order.user_id);
        }
      });
    } catch (txErr: any) {
      console.error('Failed to atomically update order status:', txErr);
      res.status(500).json({ error: 'Database transaction error while updating order.' });
      return;
    }

    // Notify user
    await db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(
      'notif_' + crypto.randomBytes(8).toString('hex'),
      order.user_id,
      `Order #${orderId} Updated`,
      `Status has been updated to ${status.toUpperCase()}. ${finalNote ? `Note: ${finalNote}` : ''}`,
      status === 'completed' ? 'success' : 'info',
      now
    );

    await logAudit(req.user!.id, req.user!.name, 'UPDATE_ORDER_STATUS', 'order', orderId, { status, fulfillmentStatus, paymentStatus, note: finalNote }, req.ip || '127.0.0.1');

    if (status === 'completed' || fulfillmentStatus === 'COMPLETED') {
      sendOrderFulfilledEmail(order, finalNote).catch((e) => console.warn('[Order Fulfilled Email Error]:', e));
    }

    const updatedOrder = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    res.json({
      message: `Order #${orderId} status set to ${status}.`,
      order: updatedOrder
    });
  } catch (err) {
    console.error('[Update Order Status Error]:', err);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
};

app.put('/api/admin/orders/:id/status', authenticate, staffOnly, updateOrderStatusHandler);
app.put('/api/admin/orders/:id', authenticate, staffOnly, updateOrderStatusHandler);

// 6. Admin Transactions & Financial Ledger
app.get('/api/admin/transactions', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transactions = await db.prepare(`
      SELECT t.*, u.email as user_email, u.name as user_name
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `).all();

    res.json({ transactions });
  } catch (err) {
    console.error('[Admin Transactions Error]:', err);
    res.status(500).json({ error: 'Failed to load transactions.' });
  }
});

// 7. Admin Support Desk & Dispute Resolution
app.get('/api/admin/tickets', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tickets = await db.prepare(`
      SELECT t.*, u.email as user_email, u.name as user_name
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.updated_at DESC
      LIMIT 100
    `).all();

    res.json({ tickets });
  } catch (err) {
    console.error('[Admin Tickets Error]:', err);
    res.status(500).json({ error: 'Failed to load support tickets.' });
  }
});

app.put('/api/admin/tickets/:id', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, replyText } = req.body;
    const ticketId = req.params.id;

    const ticket = await db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }

    const messages = JSON.parse(ticket.messages_json || '[]');
    const now = new Date().toISOString();

    if (replyText) {
      messages.push({
        sender: 'staff',
        senderName: `${req.user!.name} (${req.user!.role.toUpperCase()})`,
        text: replyText,
        time: now
      });
    }

    const newStatus = status || ticket.status;
    await db.transaction(async (tx) => {
      await tx.prepare(`
        UPDATE support_tickets
        SET status = ?, messages_json = ?, updated_at = ?
        WHERE id = ?
      `).run(newStatus, JSON.stringify(messages), now, ticketId);

      // Notify ticket creator
      await tx.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
        VALUES (?, ?, ?, ?, 'info', 0, ?)
      `).run(
        'notif_' + crypto.randomBytes(8).toString('hex'),
        ticket.user_id,
        `Support Desk Update: ${ticket.subject}`,
        `Staff response received. Ticket status is now ${newStatus.toUpperCase()}.`,
        now
      );

      await logAudit(req.user!.id, req.user!.name, 'RESOLVE_TICKET', 'ticket', ticketId, { status: newStatus }, req.ip || '127.0.0.1', tx);
    });

    res.json({ message: 'Ticket updated successfully.' });
  } catch (err) {
    console.error('[Admin Ticket Update Error]:', err);
    res.status(500).json({ error: 'Failed to update ticket.' });
  }
});

// 8. Communication Center Announcements Dispatcher
// Operational broadcast: moderators may send support announcements (staffOnly).
app.post('/api/admin/announcements', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const targetGroup = req.body?.targetGroup ?? req.body?.target ?? 'all';
    if (!title || title.length > 120 || !message || message.length > 4000) {
      res.status(400).json({ error: 'Title must be 1–120 characters and message must be 1–4,000 characters.' });
      return;
    }
    if (!['all', 'sellers', 'buyers', 'users'].includes(targetGroup)) {
      res.status(400).json({ error: 'Target audience must be all, sellers, or buyers.' });
      return;
    }

    let usersQuery = "SELECT id FROM users WHERE status = 'active'";
    if (targetGroup === 'sellers') {
      usersQuery += " AND role = 'seller'";
    } else if (targetGroup === 'buyers' || targetGroup === 'users') {
      usersQuery += " AND role = 'user'";
    }

    const targetUsers = await db.prepare(usersQuery).all() as { id: string }[];
    const now = new Date().toISOString();

    try {
      await db.transaction(async (tx) => {
        for (const u of targetUsers) {
          await tx.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
            VALUES (?, ?, ?, ?, 'info', 0, ?)
          `).run('notif_' + crypto.randomBytes(8).toString('hex'), u.id, title, message, now);
        }

        await logAudit(req.user!.id, req.user!.name, 'DISPATCH_ANNOUNCEMENT', 'broadcast', targetGroup, { recipientCount: targetUsers.length }, req.ip || '127.0.0.1', tx);
      });
    } catch (error) {
      console.error('Failed to dispatch announcement:', error);
      res.status(500).json({ error: 'Announcement could not be dispatched. No recipients were notified.' });
      return;
    }

    res.json({
      message: `Announcement dispatched to ${targetUsers.length} user(s).`,
      recipientCount: targetUsers.length
    });
  } catch (err) {
    console.error('[Dispatch Announcement Error]:', err);
    res.status(500).json({ error: 'Failed to dispatch announcement.' });
  }
});

// 9. System Audit Logs
app.get('/api/admin/audit-logs', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await db.prepare(`
      SELECT id, actor_id, actor_name, action, target_type,
        CASE
          WHEN target_type = 'session' AND action IN ('USER_LOGIN', 'FIREBASE_GOOGLE_LOGIN') THEN actor_id
          ELSE target_id
        END AS target_id,
        details_json, ip_address, created_at
      FROM audit_logs ORDER BY created_at DESC LIMIT 100
    `).all();
    res.json({ logs });
  } catch (err) {
    console.error('[Audit Logs Error]:', err);
    res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});

// ==========================================
// 10. ADMIN INVOICE MANAGEMENT & MANUAL BILLING
// ==========================================

// List All Invoices
app.get('/api/admin/invoices', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoices = await db.prepare('SELECT * FROM invoices ORDER BY invoice_date DESC LIMIT 100').all();
    res.json({ invoices });
  } catch (err) {
    console.error('[Admin Invoices Error]:', err);
    res.status(500).json({ error: 'Failed to load invoices.' });
  }
});

// Manual Invoice Creator (from requirements: manual billing system)
app.post('/api/admin/invoices', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customerName = req.body.customerName || req.body.customer_name;
    const customerEmail = req.body.customerEmail || req.body.customer_email;
    const customerPhone = req.body.customerPhone || req.body.customer_phone;
    const billingAddress = req.body.billingAddress || req.body.billing_address;
    const sellerName = req.body.sellerName || req.body.seller_name;
    const productName = req.body.productName || req.body.product_name;
    const description = req.body.description;
    const quantity = req.body.quantity;
    const unitPrice = req.body.unitPrice !== undefined ? req.body.unitPrice : req.body.unit_price;
    const platformFee = req.body.platformFee !== undefined ? req.body.platformFee : req.body.platform_fee;
    const taxPercent = req.body.taxPercent !== undefined ? req.body.taxPercent : req.body.tax_percent;
    const discountAmount = req.body.discountAmount !== undefined ? req.body.discountAmount : req.body.discount_amount;
    const paymentMethod = req.body.paymentMethod || req.body.payment_method;
    const paymentReference = req.body.paymentReference || req.body.payment_reference;
    const notes = req.body.notes;
    const status = req.body.status;

    if (!customerName || !customerEmail || !productName || unitPrice === undefined) {
      res.status(400).json({ error: 'Customer name, email, product name, and unit price are required.' });
      return;
    }

    const qty = Number(quantity) || 1;
    const price = Number(unitPrice);
    const subtotal = Math.round((qty * price) * 100) / 100;
    const fee = Number(platformFee) || 0;
    const taxRate = taxPercent !== undefined ? Number(taxPercent) : 18; // Default 18% GST
    const tax = Math.round(((subtotal + fee) * (taxRate / 100)) * 100) / 100;
    const discount = Number(discountAmount) || 0;
    const finalTotal = Math.round((subtotal + fee + tax - discount) * 100) / 100;
    const now = new Date().toISOString();

    const { invoiceId, invRow } = await db.transaction(async (tx) => {
      const nextInvoiceId = await generateNextInvoiceId(tx);

      await tx.prepare(`
        INSERT INTO invoices (
          id, order_id, customer_id, customer_name, customer_email, customer_phone,
          billing_address, seller_name, product_name, description, quantity,
          unit_price, subtotal, platform_fee, tax_amount, discount_amount, final_total,
          currency, status, payment_method, payment_reference, notes, invoice_date, created_at
        ) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?)
      `).run(
        nextInvoiceId,
        customerName,
        customerEmail,
        customerPhone || null,
        billingAddress || 'India',
        sellerName || 'VIB Official Store',
        productName,
        description || productName,
        qty,
        price,
        subtotal,
        fee,
        tax,
        discount,
        finalTotal,
        status || 'paid',
        paymentMethod || 'Manual Bank Wire / UPI',
        paymentReference || 'MANUAL-' + Date.now().toString(36).toUpperCase(),
        notes || 'Manual tax invoice created by administrative finance division.',
        now,
        now
      );

      await logAudit(
        req.user!.id,
        req.user!.name,
        'CREATE_MANUAL_INVOICE',
        'invoice',
        nextInvoiceId,
        { finalTotal, customerName, customerEmail },
        req.ip || '127.0.0.1',
        tx
      );

      const created = await tx.prepare('SELECT * FROM invoices WHERE id = ?').get(nextInvoiceId) as any;
      return { invoiceId: nextInvoiceId, invRow: created };
    });

    res.status(201).json({
      message: 'Manual invoice generated successfully.',
      invoiceId,
      invoice: {
        ...invRow,
        finalTotal,
        final_total: finalTotal,
        subtotal,
        taxAmount: tax,
        tax_amount: tax,
        status: status || 'paid'
      }
    });
  } catch (err: any) {
    console.error('Invoice creation error:', err);
    res.status(500).json({ error: 'Failed to generate invoice.' });
  }
});

// ==========================================
// 11. FINANCIAL CONTROL CENTER & EXPENSES
// ==========================================

app.get('/api/admin/finance/overview', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      grossBuyerPaidRow,
      totalCompletedOrdersRow,
      totalInvoicesPaidRow,
      totalTaxCollectedRow,
      platformCommissionsRow,
      sellerEarningsRow,
      totalExpensesRow
    ] = await Promise.all([
      db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE payment_status = 'PAYMENT_VERIFIED' OR status = 'completed'").get() as Promise<any>,
      db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").get() as Promise<any>,
      db.prepare("SELECT COALESCE(SUM(final_total), 0) as total FROM invoices WHERE status = 'paid'").get() as Promise<any>,
      db.prepare("SELECT COALESCE(SUM(tax_amount), 0) as total FROM invoices WHERE status = 'paid'").get() as Promise<any>,
      db.prepare("SELECT COALESCE(SUM(platform_fee), 0) as total FROM invoices WHERE status = 'paid'").get() as Promise<any>,
      db.prepare("SELECT COALESCE(SUM(CASE WHEN platform_fee > 0 THEN final_total - platform_fee - tax_amount ELSE 0 END), 0) as total FROM invoices WHERE status = 'paid'").get() as Promise<any>,
      db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses").get() as Promise<any>
    ]);

    const grossBuyerPaid = grossBuyerPaidRow?.total || 0;
    const totalCompletedOrders = totalCompletedOrdersRow?.count || 0;
    const totalInvoicesPaid = totalInvoicesPaidRow?.total || 0;
    const totalTaxCollected = totalTaxCollectedRow?.total || 0;
    const platformCommissions = platformCommissionsRow?.total || 0;
    const sellerEarnings = sellerEarningsRow?.total || 0;
    const totalExpenses = totalExpensesRow?.total || 0;
    const netProfit = grossBuyerPaid - sellerEarnings - totalExpenses;

    res.json({
      grossVolume: grossBuyerPaid,
      grossBuyerPaid,
      sellerEarnings,
      platformCommission: platformCommissions,
      platformCommissions,
      taxCollected: totalTaxCollected,
      totalTaxCollected,
      totalExpenses,
      netOperatingProfit: netProfit,
      netProfit,
      totalCompletedOrders,
      financeOverview: {
        grossBuyerPaid,
        totalCompletedOrders,
        totalInvoicesPaid,
        totalTaxCollected,
        totalExpenses,
        platformCommissions,
        sellerEarnings,
        netProfit,
        // No settlement ledger is configured yet; do not report placeholder counts.
        settlementQueueCount: 0,
        currency: 'INR'
      }
    });
  } catch (err) {
    console.error('[Finance Overview Error]:', err);
    res.status(500).json({ error: 'Failed to load financial overview.' });
  }
});

app.get('/api/admin/finance/expenses', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const expenses = await db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC LIMIT 100').all();
    res.json({ expenses });
  } catch (err) {
    console.error('[Get Expenses Error]:', err);
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

app.post('/api/admin/finance/expenses', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, description, amount, paymentMethod, referenceNo } = req.body;
    if (!category || !description || amount === undefined) {
      res.status(400).json({ error: 'Category, description, and amount are required.' });
      return;
    }

    const expId = 'exp_' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO expenses (id, category, description, amount, currency, payment_method, reference_no, recorded_by, expense_date, created_at)
      VALUES (?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?)
    `).run(
      expId,
      category,
      description,
      Number(amount),
      paymentMethod || 'Corporate Card',
      referenceNo || 'EXP-' + Date.now().toString(36).toUpperCase(),
      req.user!.name,
      now,
      now
    );

    await logAudit(req.user!.id, req.user!.name, 'RECORD_EXPENSE', 'expense', expId, { amount, category }, req.ip || '127.0.0.1');

    const expRow = await db.prepare('SELECT * FROM expenses WHERE id = ?').get(expId);

    res.status(201).json({
      message: 'Expense record logged successfully.',
      expenseId: expId,
      expense: expRow
    });
  } catch (err) {
    console.error('[Record Expense Error]:', err);
    res.status(500).json({ error: 'Failed to record expense.' });
  }
});

app.get('/api/admin/finance/settlements', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  // There is no persisted settlement ledger or payout provider in this app yet.
  // Returning made-up sellers, bank details, and payout amounts would mislead Finance.
  res.json({ settlements: [], configured: false, message: 'Seller settlement ledger is not configured.' });
});

// ==========================================
// 12. EMPLOYEE TASK MANAGEMENT SYSTEM
// ==========================================

app.get('/api/admin/tasks', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { department, status, priority } = req.query;
    let query = 'SELECT * FROM staff_tasks WHERE 1=1';
    const params: any[] = [];

    if (department) {
      query += ' AND department = ?';
      params.push(department);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';
    const tasks = await db.prepare(query).all(...params);
    res.json({ tasks });
  } catch (err) {
    console.error('[Get Tasks Error]:', err);
    res.status(500).json({ error: 'Failed to load tasks.' });
  }
});

app.post('/api/admin/tasks', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, department, priority, notes } = req.body;
    const assignedTo = req.body.assignedTo || req.body.assigned_to;
    const dueDate = req.body.dueDate || req.body.due_date;

    if (!title || !department) {
      res.status(400).json({ error: 'Title and department are required.' });
      return;
    }

    const taskId = 'task_' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO staff_tasks (id, title, description, department, priority, status, assigned_to, created_by, due_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
    `).run(
      taskId,
      title,
      description || '',
      department,
      priority || 'medium',
      assignedTo || 'Unassigned',
      req.user!.name,
      dueDate || null,
      notes || null,
      now,
      now
    );

    await logAudit(req.user!.id, req.user!.name, 'CREATE_STAFF_TASK', 'task', taskId, { title, department }, req.ip || '127.0.0.1');

    const taskRow = await db.prepare('SELECT * FROM staff_tasks WHERE id = ?').get(taskId);

    res.status(201).json({
      message: 'Task created.',
      taskId,
      task: taskRow
    });
  } catch (err) {
    console.error('[Create Task Error]:', err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

app.put('/api/admin/tasks/:id', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, notes } = req.body;
    const taskId = req.params.id;

    const task = await db.prepare('SELECT id FROM staff_tasks WHERE id = ?').get(taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    await db.prepare('UPDATE staff_tasks SET status = COALESCE(?, status), notes = COALESCE(?, notes), updated_at = ? WHERE id = ?')
      .run(status || null, notes || null, new Date().toISOString(), taskId);

    const taskRow = await db.prepare('SELECT * FROM staff_tasks WHERE id = ?').get(taskId);

    res.json({
      message: 'Task updated successfully.',
      task: taskRow
    });
  } catch (err) {
    console.error('[Update Task Error]:', err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// ==========================================
// 13. CUSTOMER CRM & FRAUD PREVENTION
// ==========================================

app.get('/api/admin/users/:id/crm', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const user = await db.prepare(`
      SELECT u.id, u.email, u.name, u.phone, u.riot_id, u.role, u.status, u.created_at,
             p.wallet_balance, p.kyc_status,
             COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id), 0) AS total_orders,
             p.discord_tag, p.bio
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?
    `).get(userId) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const [notes, spentRow, disputeRow] = await Promise.all([
      db.prepare('SELECT * FROM user_crm_notes WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Promise<any[]>,
      db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE user_id = ? AND status != 'cancelled'").get(userId) as Promise<any>,
      db.prepare('SELECT COUNT(*) as count FROM support_tickets WHERE user_id = ?').get(userId) as Promise<any>
    ]);
    const totalSpent = spentRow?.total || 0;
    const disputeCount = disputeRow?.count || 0;

    res.json({
      user,
      lifetimeSpent: totalSpent,
      totalSpent,
      disputesCount: disputeCount,
      disputeCount,
      fraudRisk: notes[0]?.risk_level || 'low',
      notes,
      crmProfile: {
        ...user,
        totalSpent,
        lifetimeSpent: totalSpent,
        disputeCount,
        notes,
        riskLevel: notes[0]?.risk_level || 'low',
        strikeCount: user.status === 'suspended' ? 1 : user.status === 'banned' ? 3 : 0
      }
    });
  } catch (err) {
    console.error('[Get User CRM Error]:', err);
    res.status(500).json({ error: 'Failed to load user CRM profile.' });
  }
});

app.post('/api/admin/users/:id/crm/notes', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const { note, riskLevel } = req.body;

    if (!note || !String(note).trim()) {
      res.status(400).json({ error: 'Note text cannot be empty.' });
      return;
    }

    const noteId = 'crm_note_' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO user_crm_notes (id, user_id, staff_id, staff_name, note, risk_level, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      noteId,
      userId,
      req.user!.id,
      req.user!.name,
      String(note).trim(),
      riskLevel || 'low',
      now
    );

    await logAudit(req.user!.id, req.user!.name, 'ADD_CRM_NOTE', 'user', userId, { noteId, riskLevel }, req.ip || '127.0.0.1');

    const noteRow = await db.prepare('SELECT * FROM user_crm_notes WHERE id = ?').get(noteId);

    res.status(201).json({
      message: 'Internal staff note attached to customer profile.',
      noteId,
      note: noteRow
    });
  } catch (err) {
    console.error('[Add CRM Note Error]:', err);
    res.status(500).json({ error: 'Failed to attach CRM note.' });
  }
});

// ==========================================
// 14. COMMUNICATION CENTER & EMAIL TEMPLATES
// ==========================================

app.get('/api/admin/communication/templates', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await db.prepare('SELECT * FROM email_templates ORDER BY category ASC').all();
    const templates = rows.map((t: any) => ({
      ...t,
      variables: t.variables_json ? JSON.parse(t.variables_json) : []
    }));
    res.json({ templates });
  } catch (err) {
    console.error('[Get Email Templates Error]:', err);
    res.status(500).json({ error: 'Failed to fetch email templates.' });
  }
});

app.put('/api/admin/communication/templates/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, body } = req.body;
    const templateId = req.params.id;

    const tpl = await db.prepare('SELECT id FROM email_templates WHERE id = ?').get(templateId);
    if (!tpl) {
      res.status(404).json({ error: 'Template not found.' });
      return;
    }

    if (subject !== undefined && (typeof subject !== 'string' || !subject.trim() || subject.length > 200)) {
      res.status(400).json({ error: 'Subject must be a non-empty string of 200 characters or fewer.' });
      return;
    }
    if (body !== undefined && (typeof body !== 'string' || !body.trim() || body.length > 20_000)) {
      res.status(400).json({ error: 'Template body must be a non-empty string of 20,000 characters or fewer.' });
      return;
    }
    if (subject === undefined && body === undefined) {
      res.status(400).json({ error: 'Provide a subject or body to update.' });
      return;
    }

    await db.prepare('UPDATE email_templates SET subject = COALESCE(?, subject), body = COALESCE(?, body), updated_at = ? WHERE id = ?')
      .run(subject === undefined ? null : subject.trim(), body === undefined ? null : body.trim(), new Date().toISOString(), templateId);

    const tplRow = await db.prepare('SELECT * FROM email_templates WHERE id = ?').get(templateId);
    await logAudit(req.user!.id, req.user!.name, 'UPDATE_EMAIL_TEMPLATE', 'email_template', templateId, {}, req.ip || '127.0.0.1');

    res.json({
      message: 'Email template updated successfully.',
      template: tplRow
    });
  } catch (err) {
    console.error('[Update Email Template Error]:', err);
    res.status(500).json({ error: 'Failed to update email template.' });
  }
});

// ==========================================
// 15. MANUAL PAYMENT ARCHITECTURE & SETTINGS
// ==========================================

// Get Current Active Payment Settings (Public)
app.get('/api/payment/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await db.prepare('SELECT * FROM payment_settings WHERE id = ?').get('default') as any;
    if (!settings) {
      res.json({ configured: false, settings: null });
      return;
    }
    res.json({ configured: true, ...settings, settings });
  } catch (err) {
    console.error('[Get Payment Settings Error]:', err);
    res.status(500).json({ error: 'Failed to load payment settings.' });
  }
});

// Update Payment Settings (Admin Only)
app.put('/api/admin/payment/settings', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      upi_id,
      payee_name,
      account_name,
      bank_name,
      account_number,
      ifsc_code,
      qr_image_url,
      instructions,
      support_whatsapp,
      support_email,
      manual_payment_enabled,
      status,
      payment_methods_json,
      is_active
    } = req.body;
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO payment_settings (
        id, upi_id, payee_name, account_name, bank_name, account_number, ifsc_code,
        qr_image_url, instructions, currency, support_whatsapp, support_email,
        manual_payment_enabled, status, payment_methods_json, is_active, updated_at
      )
      VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        upi_id = COALESCE(excluded.upi_id, payment_settings.upi_id),
        payee_name = COALESCE(excluded.payee_name, payment_settings.payee_name),
        account_name = COALESCE(excluded.account_name, payment_settings.account_name),
        bank_name = COALESCE(excluded.bank_name, payment_settings.bank_name),
        account_number = COALESCE(excluded.account_number, payment_settings.account_number),
        ifsc_code = COALESCE(excluded.ifsc_code, payment_settings.ifsc_code),
        qr_image_url = COALESCE(excluded.qr_image_url, payment_settings.qr_image_url),
        instructions = COALESCE(excluded.instructions, payment_settings.instructions),
        support_whatsapp = COALESCE(excluded.support_whatsapp, payment_settings.support_whatsapp),
        support_email = COALESCE(excluded.support_email, payment_settings.support_email),
        manual_payment_enabled = COALESCE(excluded.manual_payment_enabled, payment_settings.manual_payment_enabled),
        status = COALESCE(excluded.status, payment_settings.status),
        payment_methods_json = COALESCE(excluded.payment_methods_json, payment_settings.payment_methods_json),
        is_active = COALESCE(excluded.is_active, payment_settings.is_active),
        updated_at = excluded.updated_at
    `).run(
      upi_id || null,
      payee_name || null,
      account_name || payee_name || null,
      bank_name || '',
      account_number || '',
      ifsc_code || '',
      qr_image_url || null,
      instructions || '',
      support_whatsapp || '+918099641606',
      support_email || 'thevibofficial@gmail.com',
      manual_payment_enabled !== undefined ? Number(manual_payment_enabled) : 1,
      status || 'active',
      payment_methods_json ? (typeof payment_methods_json === 'string' ? payment_methods_json : JSON.stringify(payment_methods_json)) : JSON.stringify(['UPI', 'QR', 'IMPS', 'NEFT']),
      is_active !== undefined ? Number(is_active) : 1,
      now
    );

    await logAudit(req.user!.id, req.user!.name, 'UPDATE_PAYMENT_SETTINGS', 'system', 'payment_settings', req.body, req.ip || '127.0.0.1');

    const updated = await db.prepare('SELECT * FROM payment_settings WHERE id = ?').get('default');
    res.json({ message: 'Payment settings saved successfully.', settings: updated });
  } catch (err) {
    console.error('[Update Payment Settings Error]:', err);
    res.status(500).json({ error: 'Failed to update payment settings.' });
  }
});

// ==========================================
// 16. ORDER PAYMENT EVIDENCE & PUBLIC TRACKING
// ==========================================

// Submit Payment Evidence for an Order (Customer)
app.post('/api/orders/:id/payment-evidence', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id;
    const { ref, screenshot, phone, email } = req.body;

    const utr = typeof ref === 'string' ? ref.trim() : '';
    if (!/^\d{12}$/.test(utr)) {
      res.status(400).json({ error: 'Enter a valid 12-digit UTR / UPI reference number.' });
      return;
    }

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const isOwner = order.user_id === req.user!.id;
    const isStaff = ['admin', 'superadmin', 'moderator'].includes(req.user!.role);
    if (!isOwner && !isStaff) {
      res.status(403).json({ error: 'Access denied: You cannot submit evidence for this order.' });
      return;
    }

    if (!['AWAITING_PAYMENT', 'PAYMENT_REJECTED'].includes(order.payment_status)) {
      res.status(409).json({ error: 'Payment evidence can only be submitted for an unpaid or rejected order.' });
      return;
    }

    const duplicateEvidence = await db.prepare(`
      SELECT id FROM orders WHERE payment_evidence_ref = ? AND id != ? LIMIT 1
    `).get(utr, orderId);
    if (duplicateEvidence) {
      res.status(409).json({ error: 'This UTR / UPI reference has already been submitted for another order.' });
      return;
    }

    // Handle base64 image saving to disk/DB if provided
    let storedScreenshot = screenshot || null;
    if (screenshot && typeof screenshot === 'string' && screenshot.startsWith('data:image/')) {
      try {
        const matches = screenshot.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
          const buffer = Buffer.from(matches[2], 'base64');
          // P3-F4: reject screenshots whose bytes don't match the declared format.
          if (!validateImageMagicBytes(buffer, matches[1])) {
            res.status(400).json({ error: 'File content does not match declared format.' });
            return;
          }
          const safeName = `receipt_${orderId}_${Date.now()}.${ext}`;
          storedScreenshot = await saveUploadedAsset(safeName, '', buffer);
        }
      } catch (e) {
        console.warn('[Evidence Screenshot Save Warning]:', e);
      }
    }

    // Update order details if phone or email provided
    let details = {};
    try {
      details = order.details_json ? JSON.parse(order.details_json) : {};
    } catch {}
    if (phone) (details as any).contactPhone = String(phone).trim();
    if (email) (details as any).email = String(email).trim();

    const now = new Date().toISOString();
    let timeline = [];
    try {
      timeline = order.timeline_json ? JSON.parse(order.timeline_json) : [];
    } catch {}

    timeline.push({
      status: 'SUBMITTED_FOR_VERIFICATION',
      timestamp: now,
      note: `Customer submitted payment evidence. UTR: ${utr}${storedScreenshot ? ' (Screenshot attached)' : ''}`,
      actor: req.user!.name
    });

    // Check if Indian VP order has a reserved code or available code to auto-issue
    const isRegionalEv = (order.title || '').toLowerCase().includes('php') || (order.title || '').toLowerCase().includes('philippines') || (order.title || '').toLowerCase().includes('malaysia') || (order.title || '').toLowerCase().includes('singapore') || order.type === 'regional_vp';
    const isIndianVPEv = (order.type === 'vp' || (order.title || '').toLowerCase().includes('vp') || (order.title || '').toLowerCase().includes('valorant points')) && !isRegionalEv;

    const { updatedOrder, codeAssigned } = await db.transaction(async (tx) => {
      let assigned: string | null = null;
      let newPaymentStatus = 'SUBMITTED_FOR_VERIFICATION';
      let newFulfillmentStatus = order.fulfillment_status || 'PENDING';
      let newOrderStatus = order.status || 'processing';

      if (isIndianVPEv) {
        let codeRow = await tx.prepare(`
          SELECT id, code FROM vp_codes WHERE order_id = ? AND status = 'reserved' LIMIT 1
        `).get(orderId) as any;

        if (!codeRow) {
          const pkgId = resolveIndianVPPackageId(order.title, (details as any)?.productId || (details as any)?.package_id);
          if (pkgId) {
            codeRow = await tx.prepare(`
              SELECT id, code FROM vp_codes
              WHERE (package_id = ? OR package_id = ?) AND status = 'available'
              LIMIT 1
            `).get(pkgId, pkgId.replace('vp-', 'in-')) as any;
          }
        }

        if (codeRow) {
          await tx.prepare(`
            UPDATE vp_codes SET status = 'issued', order_id = ?, issued_at = ? WHERE id = ?
          `).run(orderId, now, codeRow.id);

          assigned = codeRow.code;
          newPaymentStatus = 'PAYMENT_VERIFIED';
          newFulfillmentStatus = 'COMPLETED';
          newOrderStatus = 'completed';

          timeline.push({
            status: 'COMPLETED',
            timestamp: now,
            note: `Automated Indian VP code issued to customer: ${codeRow.code}`,
            actor: 'system'
          });
        }
      }

      await tx.prepare(`
        UPDATE orders SET
          payment_status = ?,
          fulfillment_status = ?,
          status = ?,
          issued_code = COALESCE(?, issued_code),
          code_issued_at = CASE WHEN ? IS NOT NULL THEN ? ELSE code_issued_at END,
          payment_evidence_ref = ?,
          payment_evidence_image = COALESCE(?, payment_evidence_image),
          details_json = ?,
          timeline_json = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        newPaymentStatus,
        newFulfillmentStatus,
        newOrderStatus,
        assigned,
        assigned,
        now,
        utr,
        storedScreenshot,
        JSON.stringify(details),
        JSON.stringify(timeline),
        now,
        orderId
      );

      const updated = await tx.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
      return { updatedOrder: updated, codeAssigned: assigned };
    });

    if (codeAssigned) {
      sendIndianVPCodeIssuedEmail({ ...order, id: orderId, user_email: req.user!.email }, codeAssigned).catch((e) => console.warn(e));
    }

    // Send pending verification emails to customer & administrator
    sendOrderPendingVerificationEmail({
      ...updatedOrder,
      user_email: req.user!.email,
      payment_evidence_ref: utr,
    }).catch((e) => console.warn('[Payment Evidence Email Warning]:', e));

    res.json({
      message: 'Payment evidence submitted successfully! Staff will verify your payment shortly.',
      order: updatedOrder
    });
  } catch (err) {
    console.error('[Payment Evidence Error]:', err);
    res.status(500).json({ error: 'Failed to submit payment evidence.' });
  }
});

// Update Delivery Contact (Phone / WhatsApp & Email) for Confirmed Manual Delivery Orders
app.put('/api/orders/:id/delivery-contact', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id;
    const { phone, email, notes } = req.body;

    if (!phone && !email) {
      res.status(400).json({ error: 'Please provide at least a phone number or email address.' });
      return;
    }

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const isOwner = order.user_id === req.user!.id;
    const isStaff = ['admin', 'superadmin', 'moderator'].includes(req.user!.role);
    if (!isOwner && !isStaff) {
      res.status(403).json({ error: 'Access denied: You cannot update delivery contact for this order.' });
      return;
    }

    if (order.payment_status !== 'PAYMENT_VERIFIED') {
      res.status(409).json({ error: 'Delivery contact can only be updated after payment is verified.' });
      return;
    }
    if (order.issued_code || ['COMPLETED', 'CANCELLED'].includes(String(order.fulfillment_status || '').toUpperCase()) || String(order.status || '').toLowerCase() === 'completed') {
      res.status(409).json({ error: 'Delivery contact can no longer be changed for this order.' });
      return;
    }

    const phoneValue = phone == null ? '' : String(phone).trim();
    const emailValue = email == null ? '' : String(email).trim();
    const notesValue = notes == null ? '' : String(notes).trim();
    if (phoneValue && (phoneValue.length > 32 || !/^[+()\d\s.-]{7,32}$/.test(phoneValue))) {
      res.status(400).json({ error: 'Please provide a valid phone or WhatsApp number.' });
      return;
    }
    if (emailValue && (emailValue.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue))) {
      res.status(400).json({ error: 'Please provide a valid delivery email address.' });
      return;
    }
    if (notesValue.length > 1000) {
      res.status(400).json({ error: 'Delivery notes must be 1000 characters or fewer.' });
      return;
    }

    let details: any = {};
    try {
      details = order.details_json ? JSON.parse(order.details_json) : {};
    } catch {}

    if (phoneValue) details.contactPhone = phoneValue;
    if (emailValue) details.email = emailValue;
    if (notesValue) details.deliveryNotes = notesValue;

    const now = new Date().toISOString();
    let timeline = [];
    try {
      timeline = order.timeline_json ? JSON.parse(order.timeline_json) : [];
    } catch {}

    timeline.push({
      status: order.payment_status || 'PROCESSING',
      timestamp: now,
      note: 'Customer updated delivery contact information.',
      actor: req.user!.name
    });

    const updatedOrder = await db.transaction(async (tx) => {
      await tx.prepare(`
        UPDATE orders SET
          details_json = ?,
          timeline_json = ?,
          updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(details), JSON.stringify(timeline), now, orderId);

      // Also post an automated system notice to Order Room
      await tx.prepare(`
        INSERT INTO order_messages (id, order_id, sender_id, sender_name, sender_role, message, flagged, created_at)
        VALUES (?, ?, 'system', 'VIB Dispatch System', 'system', ?, 0, ?)
      `).run(
        'msg_' + crypto.randomBytes(6).toString('hex'),
        orderId,
        'Delivery contact details were updated by the customer. Staff can view the current details in the order record for dispatch coordination.',
        now
      );

      return tx.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    });

    res.json({
      message: 'Delivery contact information saved successfully!',
      order: updatedOrder
    });
  } catch (err) {
    console.error('[Delivery Contact Update Error]:', err);
    res.status(500).json({ error: 'Failed to update delivery contact.' });
  }
});

// Public Live Order Tracking
app.get('/api/orders/track/:orderId', async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = req.params.orderId;
    const order = await db.prepare(`
      SELECT o.id, o.type, o.title, o.amount, o.currency, o.status, o.payment_status,
             o.fulfillment_status, o.payment_evidence_ref, o.payment_evidence_image,
             o.issued_code, o.code_issued_at,
             o.timeline_json, o.details_json, o.created_at, o.updated_at
      FROM orders o
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order) {
      res.status(404).json({ error: 'Order not found. Please verify the order reference number.' });
      return;
    }

    let timeline = [];
    let details = {};
    try { timeline = order.timeline_json ? JSON.parse(order.timeline_json) : []; } catch {}
    try { details = order.details_json ? JSON.parse(order.details_json) : {}; } catch {}

    const whatsappMsg = encodeURIComponent(`Hello VIB Digital Services, I need assistance with my order #${order.id} (${order.title}).`);
    const whatsappUrl = `https://wa.me/918099641606?text=${whatsappMsg}`;

    res.json({
      order: {
        ...order,
        timeline,
        details,
        whatsappSupportUrl: whatsappUrl
      }
    });
  } catch (err) {
    console.error('[Order Track Error]:', err);
    res.status(500).json({ error: 'Failed to fetch tracking details.' });
  }
});

// ==========================================
// 17. ADMIN MANUAL PAYMENT VERIFICATION & FULFILLMENT
// ==========================================

app.put('/api/admin/orders/:id/verify-payment', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id;
    const { action, notes, reason } = req.body;

    const order = await db.prepare('SELECT o.*, u.email as user_email, u.name as user_name FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?').get(orderId) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    // Staff must verify customer-submitted evidence against bank records before
    // approval or rejection. Never allow an unpaid order to be marked as paid.
    if (order.payment_status !== 'SUBMITTED_FOR_VERIFICATION') {
      res.status(409).json({ error: 'Payment can only be verified after the customer submits payment evidence.' });
      return;
    }
    if (typeof order.payment_evidence_ref !== 'string' || !/^\d{12}$/.test(order.payment_evidence_ref)) {
      res.status(409).json({ error: 'A valid 12-digit UTR / UPI reference is required before payment verification.' });
      return;
    }
    if (action !== 'approve' && action !== 'reject') {
      res.status(400).json({ error: 'Payment verification action must be approve or reject.' });
      return;
    }

    const now = new Date().toISOString();
    let timeline = [];
    try { timeline = order.timeline_json ? JSON.parse(order.timeline_json) : []; } catch {}

    if (action === 'reject') {
      timeline.push({
        status: 'PAYMENT_REJECTED',
        timestamp: now,
        note: reason || 'Payment rejected by administrator during verification.',
        actor: req.user!.name
      });

      const updated = await db.transaction(async (tx) => {
        await tx.prepare(`
          UPDATE orders SET
            payment_status = 'PAYMENT_REJECTED',
            fulfillment_status = 'CANCELLED',
            status = 'cancelled',
            admin_notes = ?,
            timeline_json = ?,
            updated_at = ?
          WHERE id = ?
        `).run(reason || notes || 'Payment rejected', JSON.stringify(timeline), now, orderId);

        await tx.prepare("UPDATE transactions SET status = 'cancelled' WHERE order_id = ?").run(orderId);
        await tx.prepare("UPDATE invoices SET status = 'cancelled' WHERE order_id = ?").run(orderId);

        await tx.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
          VALUES (?, ?, ?, ?, 'order', 0, ?)
        `).run(
          'notif_' + crypto.randomBytes(8).toString('hex'),
          order.user_id,
          `Payment Verification Unresolved: #${order.id}`,
          `Your payment verification for order #${order.id} was rejected: ${reason || 'Invalid reference'}. Please review your order tracking page.`,
          now
        );

        await logAudit(req.user!.id, req.user!.name, 'REJECT_PAYMENT', 'order', orderId, { reason }, req.ip || '127.0.0.1', tx);

        return await tx.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      });

      sendPaymentRejectedEmail(order, reason || 'Transaction UTR could not be verified in banking records.').catch((e) => console.warn(e));
      res.json({ message: 'Payment marked as rejected. Customer notified.', order: updated });
      return;
    }

    timeline.push({
      status: 'PAYMENT_VERIFIED',
      timestamp: now,
      note: `Payment verified by ${req.user!.name}.`,
      actor: req.user!.name
    });

    const titleLower = order.title.toLowerCase();
    const isRegionalVP = titleLower.includes('php') || titleLower.includes('philippines') || titleLower.includes('malaysia') || titleLower.includes('myr') || titleLower.includes('indonesia') || titleLower.includes('idr') || titleLower.includes('singapore') || titleLower.includes('sgd') || order.type === 'regional_vp';
    const isIndianVP = (order.type === 'vp' || titleLower.includes('valorant points') || titleLower.includes('vp')) && !isRegionalVP;

    const txResult = await db.transaction(async (tx) => {
      let codeAssigned: string | null = null;
      let newFulfillmentStatus = 'PROCESSING';
      let newOrderStatus = 'processing';
      let inventoryShortagePackage: string | null = null;

      if (isIndianVP) {
        // Resolve package ID for code inventory matching
        const pkgId = resolveIndianVPPackageId(order.title, (order.details_json ? JSON.parse(order.details_json) : {})?.productId);

        // Atomic code reservation from inventory (check both vp- and in- prefixes)
        let codeRow = await tx.prepare(`
          SELECT * FROM vp_codes WHERE order_id = ? AND status = 'reserved' LIMIT 1
        `).get(orderId) as any;
        if (!codeRow && pkgId) {
          codeRow = await tx.prepare(`
            SELECT * FROM vp_codes WHERE package_id = ? AND status = 'available' LIMIT 1
          `).get(pkgId) as any;
        }
        if (!codeRow && pkgId && pkgId.startsWith('vp-')) {
          codeRow = await tx.prepare(`
            SELECT * FROM vp_codes WHERE package_id = ? AND status = 'available' LIMIT 1
          `).get(pkgId.replace('vp-', 'in-')) as any;
        }

        if (codeRow) {
          await tx.prepare(`
            UPDATE vp_codes SET status = 'issued', order_id = ?, issued_at = ? WHERE id = ?
          `).run(orderId, now, codeRow.id);

          codeAssigned = codeRow.code;
          newFulfillmentStatus = 'COMPLETED';
          newOrderStatus = 'completed';

          timeline.push({
            status: 'COMPLETED',
            timestamp: now,
            note: `Indian VP code issued to customer: ${codeRow.code}`,
            actor: 'system'
          });
        } else {
          // Stock shortage: Do NOT fake a code! Honest fulfillment pending
          const pkgLabel = pkgId || order.title;
          newFulfillmentStatus = 'FULFILLMENT_PENDING';
          timeline.push({
            status: 'FULFILLMENT_PENDING',
            timestamp: now,
            note: `Payment approved, but code inventory for ${pkgLabel} is depleted. Order held in fulfillment queue.`,
            actor: 'system'
          });

          inventoryShortagePackage = pkgLabel;
        }
      } else if (order.title.toLowerCase().includes('php') || order.type === 'regional_vp') {
        // Regional VP: Strictly manual fulfillment via WhatsApp
        newFulfillmentStatus = 'PROCESSING';
        timeline.push({
          status: 'PROCESSING',
          timestamp: now,
          note: 'Payment verified. Regional pack dispatch coordinated via WhatsApp support desk.',
          actor: req.user!.name
        });
      } else {
        // Marketplace Profile / Service
        newFulfillmentStatus = 'PROCESSING';
        timeline.push({
          status: 'PROCESSING',
          timestamp: now,
          note: 'Payment verified. Middleman escrow transfer initiated.',
          actor: req.user!.name
        });
      }

      await tx.prepare(`
        UPDATE orders SET
          payment_status = 'PAYMENT_VERIFIED',
          fulfillment_status = ?,
          status = ?,
          verified_by = ?,
          verified_at = ?,
          issued_code = COALESCE(?, issued_code),
          code_issued_at = CASE WHEN ? IS NOT NULL THEN ? ELSE code_issued_at END,
          admin_notes = ?,
          timeline_json = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        newFulfillmentStatus,
        newOrderStatus,
        req.user!.name,
        now,
        codeAssigned,
        codeAssigned,
        now,
        notes || 'Payment approved',
        JSON.stringify(timeline),
        now,
        orderId
      );

      // Atomically synchronize transactions and invoices
      await tx.prepare("UPDATE transactions SET status = 'success' WHERE order_id = ?").run(orderId);
      await tx.prepare("UPDATE invoices SET status = 'paid' WHERE order_id = ?").run(orderId);
      await tx.prepare(`
        UPDATE profiles SET total_orders = (
          SELECT COUNT(*) FROM orders WHERE user_id = ?
        ) WHERE user_id = ?
      `).run(order.user_id, order.user_id);

      // Notify customer dashboard
      await tx.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
        VALUES (?, ?, ?, ?, 'order', 0, ?)
      `).run(
        'notif_' + crypto.randomBytes(8).toString('hex'),
        order.user_id,
        `Payment Approved: #${order.id}`,
        codeAssigned
          ? `Payment verified! Your VP code for order #${order.id} has been issued and sent to your email.`
          : `Payment verified! Your order #${order.id} is now being fulfilled by our operations team.`,
        now
      );

      await logAudit(req.user!.id, req.user!.name, 'APPROVE_PAYMENT', 'order', orderId, { codeAssigned, fulfillmentStatus: newFulfillmentStatus }, req.ip || '127.0.0.1', tx);

      const updated = await tx.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      return { updated, codeAssigned, inventoryShortagePackage };
    });

    if (txResult.codeAssigned) {
      sendIndianVPCodeIssuedEmail(order, txResult.codeAssigned).catch((e) => console.warn(e));
    } else if (txResult.inventoryShortagePackage) {
      sendInventoryShortageAlert({ ...order, package_id: txResult.inventoryShortagePackage }).catch((e) => console.warn(e));
    } else {
      sendOrderPaymentVerifiedEmail(order, true).catch((e) => console.warn('[Manual Delivery Email Error]:', e));
    }

    res.json({
      message: txResult.codeAssigned
        ? 'Payment verified and genuine VP code automatically issued to customer!'
        : 'Payment verified successfully. Order transitioned to fulfillment queue.',
      order: txResult.updated,
      codeIssued: Boolean(txResult.codeAssigned)
    });
  } catch (error) {
    console.error('[Payment Verification Transaction Error]:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Payment verification could not be completed. No partial changes were committed.' });
  }
});

// Issue VP Code manually to an order and dispatch email
app.post('/api/admin/orders/:id/issue-code', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id;
    const { code } = req.body;

    if (!code || !String(code).trim()) {
      res.status(400).json({ error: 'Please enter a valid Valorant Points code.' });
      return;
    }

    const cleanCode = String(code).trim();
    const order = await db.prepare(`
      SELECT o.*, u.email as user_email, u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const now = new Date().toISOString();
    let timeline = [];
    try { timeline = order.timeline_json ? JSON.parse(order.timeline_json) : []; } catch {}
    timeline.push({
      status: 'COMPLETED',
      timestamp: now,
      note: `VP code manually issued by ${req.user!.name}: ${cleanCode}`,
      actor: req.user!.name
    });

    await db.transaction(async (tx) => {
      await tx.prepare(`
        UPDATE orders SET
          issued_code = ?,
          code_issued_at = ?,
          fulfillment_status = 'COMPLETED',
          status = 'completed',
          timeline_json = ?,
          updated_at = ?
        WHERE id = ?
      `).run(cleanCode, now, JSON.stringify(timeline), now, orderId);

      // Synchronize financial records
      await tx.prepare("UPDATE transactions SET status = 'success' WHERE order_id = ?").run(orderId);
      await tx.prepare("UPDATE invoices SET status = 'paid' WHERE order_id = ?").run(orderId);

      // Post system notice to Order Room
      const msgId = 'msg_' + crypto.randomBytes(6).toString('hex');
      await tx.prepare(`
        INSERT INTO order_messages (id, order_id, sender_id, sender_name, sender_role, message, attachment_url, flagged, flag_reason, created_at)
        VALUES (?, ?, ?, ?, 'system', ?, NULL, 0, NULL, ?)
      `).run(
        msgId,
        orderId,
        req.user!.id,
        'VIB Operations Desk',
        `Official VP Code Issued: ${cleanCode}. Code has been sent to your email with instructions.`,
        now
      );
    });

    // Send Code Email to customer
    try {
      await sendIndianVPCodeIssuedEmail(order, cleanCode);
    } catch (err) {
      console.warn('[Issue Code Email Error]:', err);
    }

    const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    res.json({
      message: `VP code (${cleanCode}) successfully issued and emailed to customer!`,
      order: updated,
      code: cleanCode
    });
  } catch (err) {
    console.error('[Issue Code Error]:', err);
    res.status(500).json({ error: 'Failed to issue VP code.' });
  }
});

// Re-send VP Code email for an existing completed order
app.post('/api/admin/orders/:id/resend-code-email', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id;
    const order = await db.prepare(`
      SELECT o.*, u.email as user_email, u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (!order.issued_code) {
      res.status(400).json({ error: 'No VP code has been issued for this order yet.' });
      return;
    }

    await sendIndianVPCodeIssuedEmail(order, order.issued_code);
    res.json({ message: `VP code email successfully re-sent to customer for order #${orderId}.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to re-send code email: ' + (err?.message || err) });
  }
});

// ==========================================
// 18. INDIAN VP CODE INVENTORY MANAGEMENT
// ==========================================

// List VP Codes & Stock Summary
app.get('/api/admin/vp-codes', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { package_id, status } = req.query;
    let query = 'SELECT * FROM vp_codes WHERE 1=1';
    const params: any[] = [];

    if (package_id) {
      if (package_id === 'vp-7400' || package_id === 'in-7400') {
        query += " AND (package_id = 'vp-7400' OR package_id = 'in-7400')";
      } else {
        query += ' AND package_id = ?';
        params.push(package_id);
      }
    }
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT 300';

    const codes = await db.prepare(query).all(...params);

    // Calculate stock breakdown, consolidating in-7400 into vp-7400 for consistent UI metrics
    const summaryRows = await db.prepare(`
      SELECT CASE WHEN package_id = 'in-7400' THEN 'vp-7400' ELSE package_id END as package_id,
             COUNT(*) as total,
             SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
             SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued,
             SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved
      FROM vp_codes
      GROUP BY CASE WHEN package_id = 'in-7400' THEN 'vp-7400' ELSE package_id END
    `).all();

    res.json({ codes, summary: summaryRows });
  } catch (err) {
    console.error('Fetch VP codes error:', err);
    res.status(500).json({ error: 'Failed to fetch VP codes.' });
  }
});

// Add / Import VP Codes in Bulk (Transactional, Validated, Idempotent, with Duplicate Reporting)
app.post('/api/admin/vp-codes', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { package_id, codes, batch_no } = req.body;

    if (!package_id || !codes) {
      res.status(400).json({ error: 'Package ID and code list are required.' });
      return;
    }

    // 1. Validate package denomination (support both vp- and in- prefixes for all 13 denominations)
    const normalizedPackId = String(package_id).trim().replace(/^in-/, 'vp-');
    const VALID_PACKAGES = [
      'vp-475', 'vp-1000', 'vp-2050', 'vp-3650', 'vp-5350', 'vp-7400',
      'vp-11000', 'vp-14650', 'vp-22000', 'vp-44000', 'vp-66000', 'vp-110000', 'vp-220000'
    ];
    if (!VALID_PACKAGES.includes(normalizedPackId)) {
      res.status(400).json({
        error: `Invalid package ID: '${package_id}'. Valid Indian VP packages: 475, 1,000, 2,050, 3,650, 5,350, 7,400, 11,000, 14,650, 22,000, 44,000, 66,000, 110,000, 220,000 VP.`
      });
      return;
    }

    // 2. Parse and split codes
    let codeList: string[] = [];
    if (Array.isArray(codes)) {
      codeList = codes.map((c: string) => String(c).trim()).filter(Boolean);
    } else if (typeof codes === 'string') {
      codeList = codes.split(/[\r\n,;|\t]+/).map((c) => c.trim()).filter(Boolean);
    }

    if (codeList.length === 0) {
      res.status(400).json({ error: 'No valid prepaid codes provided in submission. Please paste at least one code.' });
      return;
    }

    // 3. Validate code string formatting
    const codeRegex = /^[A-Za-z0-9\-_]{6,64}$/;
    const invalidCodes = codeList.filter((c) => !codeRegex.test(c));
    if (invalidCodes.length > 0) {
      const preview = invalidCodes.slice(0, 3).map((c) => c.length > 10 ? c.slice(0, 8) + '...' : c).join(', ');
      res.status(400).json({
        error: `Invalid code format detected (${invalidCodes.length} code${invalidCodes.length > 1 ? 's' : ''}: ${preview}). Codes must be 6 to 64 alphanumeric characters (letters, numbers, hyphens).`
      });
      return;
    }

    // 4. Deduplicate codes in the current submission
    const uniqueSubmitted = Array.from(new Set(codeList));

    // 5. Query existing database records to distinguish duplicates
    const existingRecords: any[] = [];
    // Chunk in batches of 100 for SQLite parameter limits
    const CHUNK_SIZE = 100;
    for (let i = 0; i < uniqueSubmitted.length; i += CHUNK_SIZE) {
      const chunk = uniqueSubmitted.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => '?').join(',');
      const rows = await db.prepare(`SELECT code, package_id, status, batch_no FROM vp_codes WHERE code IN (${placeholders})`).all(...chunk);
      existingRecords.push(...rows);
    }

    const existingSet = new Set(existingRecords.map((r: any) => r.code));
    const newCodes = uniqueSubmitted.filter((c) => !existingSet.has(c));
    const duplicateCodes = existingRecords.map((r: any) => ({
      codeMasked: r.code.length > 8 ? r.code.substring(0, 4) + '****' + r.code.slice(-3) : '****',
      package_id: r.package_id,
      status: r.status,
      batch_no: r.batch_no,
    }));

    const now = new Date().toISOString();
    const batch = batch_no && String(batch_no).trim() ? String(batch_no).trim() : `BATCH-${Date.now().toString(36).toUpperCase()}`;

    // 6. Transactional atomic insertion of genuine new codes
    if (newCodes.length > 0) {
      try {
        await db.transaction(async (tx) => {
          const insertStmt = tx.prepare(`
            INSERT INTO vp_codes (id, package_id, code, status, batch_no, created_at)
            VALUES (?, ?, ?, 'available', ?, ?)
          `);

          for (const code of newCodes) {
            const id = 'vpc_' + crypto.randomBytes(8).toString('hex');
            await insertStmt.run(id, normalizedPackId, code, batch, now);
          }
        });
      } catch (txErr: any) {
        console.error('[VP Vault Import Error]:', txErr);
        res.status(500).json({ error: 'Database transaction failed during inventory import. No records were modified.' });
        return;
      }
    }

    // 7. Audit logging
    await logAudit(
      req.user!.id,
      req.user!.name,
      'IMPORT_VP_CODES',
      'vp_codes',
      normalizedPackId,
      {
        batch,
        totalSubmitted: uniqueSubmitted.length,
        addedCount: newCodes.length,
        duplicatesSkipped: duplicateCodes.length,
      },
      req.ip || '127.0.0.1'
    );

    const message = newCodes.length > 0
      ? `Successfully imported ${newCodes.length} genuine VP code${newCodes.length > 1 ? 's' : ''} into inventory.${duplicateCodes.length > 0 ? ` ${duplicateCodes.length} duplicate code(s) were skipped (inventory preserved).` : ''}`
      : `All ${duplicateCodes.length} submitted code(s) already exist in vault inventory. Inventory preserved without duplication.`;

    res.status(201).json({
      success: true,
      message,
      addedCount: newCodes.length,
      duplicatesSkipped: duplicateCodes.length,
      duplicates: duplicateCodes,
      package_id: normalizedPackId,
      batch,
      totalSubmitted: uniqueSubmitted.length,
    });
  } catch (err) {
    console.error('[VP Vault Route Error]:', err);
    res.status(500).json({ error: 'Failed to process VP code import.' });
  }
});

// Delete or Invalidate Unused VP Code
// VP code vault management is operational (staffOnly); deleting an *issued* code
// remains blocked below, preserving audit integrity.
app.delete('/api/admin/vp-codes/:id', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const codeId = req.params.id;
    const code = await db.prepare('SELECT * FROM vp_codes WHERE id = ?').get(codeId) as any;
    if (!code) {
      res.status(404).json({ error: 'VP code not found.' });
      return;
    }

    if (code.status === 'issued') {
      res.status(400).json({ error: 'Cannot delete an already issued code. Audit integrity preserved.' });
      return;
    }

    await db.prepare('DELETE FROM vp_codes WHERE id = ?').run(codeId);
    await logAudit(req.user!.id, req.user!.name, 'DELETE_VP_CODE', 'vp_codes', codeId, { code: code.code }, req.ip || '127.0.0.1');

    res.json({ message: 'VP code deleted from inventory.' });
  } catch (err) {
    console.error('Delete VP code error:', err);
    res.status(500).json({ error: 'Failed to delete VP code.' });
  }
});

// ==========================================
// 19. REGIONAL VP ORDERS WORKFLOW (PHP / IDR / MYR)
// ==========================================

app.get('/api/admin/regional-orders', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.toLowerCase() : 'all';
    if (!['all', 'processing', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Regional order status filter is invalid.' });
      return;
    }
    const conditions = [`(
        o.type = 'regional_vp'
        OR (o.type = 'vp' AND (
          LOWER(o.title) LIKE '%philippines%'
          OR LOWER(o.title) LIKE '%malaysia%'
          OR LOWER(o.title) LIKE '%indonesia%'
          OR LOWER(o.title) LIKE '%singapore%'
          OR LOWER(o.details_json) LIKE '%"region":"philippines"%'
          OR LOWER(o.details_json) LIKE '%"region":"malaysia"%'
          OR LOWER(o.details_json) LIKE '%"region":"indonesia"%'
          OR LOWER(o.details_json) LIKE '%"region":"singapore"%'
        ))
      )`];
    const params: string[] = [];
    if (status !== 'all') {
      conditions.push('LOWER(o.status) = ?');
      params.push(status);
    }

    const orders = await db.prepare(`
      SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY o.created_at DESC
    `).all(...params);

    res.json({ orders });
  } catch (err) {
    console.error('Fetch regional orders error:', err);
    res.status(500).json({ error: 'Failed to load regional orders.' });
  }
});

app.put('/api/admin/regional-orders/:id/status', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id;
    const rawStatus = req.body.fulfillment_status ?? req.body.status;
    const requestedStatus = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : '';
    const notesValue = req.body.notes ?? req.body.regional_notes;
    const notes = typeof notesValue === 'string' ? notesValue.trim() : '';

    if (!['processing', 'completed', 'cancelled'].includes(requestedStatus)) {
      res.status(400).json({ error: 'Fulfillment status must be processing, completed, or cancelled.' });
      return;
    }
    if (notes.length > 2000) {
      res.status(400).json({ error: 'Regional fulfillment notes must be 2,000 characters or fewer.' });
      return;
    }

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!order) {
      res.status(404).json({ error: 'Regional order not found.' });
      return;
    }

    const titleLower = String(order.title || '').toLowerCase();
    const isRegionalOrder = order.type === 'regional_vp' || (order.type === 'vp' && (
      titleLower.includes('philippines') || titleLower.includes('malaysia') || titleLower.includes('indonesia') || titleLower.includes('singapore')
    ));
    if (!isRegionalOrder) {
      res.status(404).json({ error: 'Order is not in the regional fulfillment queue.' });
      return;
    }
    if (order.payment_status !== 'PAYMENT_VERIFIED') {
      res.status(409).json({ error: 'Regional fulfillment can only change after payment is verified.' });
      return;
    }
    const currentStatus = String(order.status || '').toLowerCase();
    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
      res.status(409).json({ error: 'Completed or cancelled regional orders cannot be changed again.' });
      return;
    }
    if (requestedStatus === 'completed' && !notes) {
      res.status(400).json({ error: 'Add an operations note confirming the regional top-up before marking the order complete.' });
      return;
    }

    const now = new Date().toISOString();
    let timeline = [];
    try { timeline = order.timeline_json ? JSON.parse(order.timeline_json) : []; } catch {}

    const fulfillmentStatus = requestedStatus.toUpperCase();
    const message = requestedStatus === 'completed'
      ? `Regional top-up completed for order #${orderId}.`
      : requestedStatus === 'cancelled'
        ? `Regional fulfillment for order #${orderId} was cancelled. Any refund must be handled separately.`
        : `Regional order #${orderId} is being processed.`;

    timeline.push({
      status: fulfillmentStatus,
      timestamp: now,
      note: notes || `Regional fulfillment updated to ${fulfillmentStatus}.`,
      actor: req.user!.name
    });

    const updated = await db.transaction(async (tx) => {
      await tx.prepare(`
        UPDATE orders SET
          fulfillment_status = ?,
          status = ?,
          regional_notes = COALESCE(?, regional_notes),
          timeline_json = ?,
          updated_at = ?
        WHERE id = ?
      `).run(fulfillmentStatus, requestedStatus, notes || null, JSON.stringify(timeline), now, orderId);
      await tx.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
        VALUES (?, ?, ?, ?, 'order', 0, ?)
      `).run(
        'notif_' + crypto.randomBytes(8).toString('hex'),
        order.user_id,
        `Regional order update: #${orderId}`,
        message,
        now
      );
      await logAudit(req.user!.id, req.user!.name, 'UPDATE_REGIONAL_ORDER_STATUS', 'order', orderId, { status: requestedStatus }, req.ip || '127.0.0.1', tx);
      return await tx.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    });

    if (requestedStatus === 'completed') {
      sendOrderFulfilledEmail(order, notes).catch((e) => console.warn('[Regional Order Fulfilled Email Error]:', e));
    }

    res.json({ message: 'Regional order fulfillment status updated.', order: updated });
  } catch (error) {
    console.error('[Regional Fulfillment Error]:', error);
    res.status(500).json({ error: 'Regional fulfillment update failed. No partial changes were committed.' });
  }
});

// ==========================================
// 20. REAL MARKETPLACE LISTINGS & VIP PLANS
// ==========================================

// Public Listings Feed
app.get('/api/listings', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, rank, region, featured, guarantee_type, page = 1, limit = 20 } = req.query;
    let query = "SELECT * FROM listings WHERE status = 'published'";
    const params: any[] = [];

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR skins_json LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (rank) {
      query += ' AND rank = ?';
      params.push(rank);
    }
    if (region) {
      query += ' AND region = ?';
      params.push(region);
    }
    if (guarantee_type) {
      if (guarantee_type === 'lifetime_guaranteed' || guarantee_type === 'guaranteed') {
        query += " AND guarantee_type IN ('lifetime_guaranteed', 'guaranteed')";
      } else {
        query += ' AND guarantee_type = ?';
        params.push(guarantee_type);
      }
    }
    if (featured === '1' || featured === 'true') {
      query += ' AND featured = 1';
    }

    query += ' ORDER BY featured DESC, created_at DESC';
    const offset = (Number(page) - 1) * Number(limit);
    query += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    const rows = (await db.prepare(query).all(...params)).map((item: any) => ({
      ...item,
      images: item.images_json ? JSON.parse(item.images_json) : [],
      skins: item.skins_json ? JSON.parse(item.skins_json) : []
    }));

    let countQuery = "SELECT COUNT(*) as count FROM listings WHERE status = 'published'";
    const countParams: any[] = [];
    if (guarantee_type) {
      if (guarantee_type === 'lifetime_guaranteed' || guarantee_type === 'guaranteed') {
        countQuery += " AND guarantee_type IN ('lifetime_guaranteed', 'guaranteed')";
      } else {
        countQuery += ' AND guarantee_type = ?';
        countParams.push(guarantee_type);
      }
    }
    if (featured === '1' || featured === 'true') {
      countQuery += ' AND featured = 1';
    }
    const totalCount = ((await db.prepare(countQuery).get(...countParams)) as any).count;

    res.json({ listings: rows, total: totalCount, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('Fetch listings error:', err);
    res.status(500).json({ error: 'Failed to load marketplace listings.' });
  }
});

// Single Listing Detail
app.get('/api/listings/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const aliasMap: Record<string, string> = {
      'p-a1023': 'lst_immortal_kuronami',
      'p-a1024': 'lst_radiant_singularity',
      'p-a1025': 'lst_ascendant_prime',
      'p-a1026': 'lst_diamond_daily',
      'spotlight-reyna': 'lst_immortal_kuronami',
    };
    const targetId = aliasMap[req.params.id] || req.params.id;
    const listing = await db.prepare('SELECT * FROM listings WHERE id = ?').get(targetId) as any;
    if (!listing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    const rawSkins = listing.skins_json ? JSON.parse(listing.skins_json) : [];
    const hydratedSkins = await Promise.all(rawSkins.map(async (item: any) => {
      const skinName = typeof item === 'string' ? item : item?.name;
      if (skinName) {
        const match = await db.prepare(
          'SELECT id, name, weapon, collection, tier, image_url, video_url FROM skins WHERE name = ? OR name LIKE ? LIMIT 1'
        ).get(skinName, `%${skinName}%`) as any;
        if (match) {
          return {
            name: match.name,
            weapon: match.weapon,
            collection: match.collection,
            tier: match.tier,
            image_url: match.image_url,
            video_url: match.video_url
          };
        }
      }
      return typeof item === 'object' && item !== null
        ? item
        : { name: item, weapon: 'Weapon Skin', collection: 'Official Collection', tier: 'Exclusive', image_url: null, video_url: null };
    }));

    res.json({
      listing: {
        ...listing,
        images: listing.images_json ? JSON.parse(listing.images_json) : [],
        skins: hydratedSkins
      }
    });
  } catch (err) {
    console.error('Fetch single listing error:', err);
    res.status(500).json({ error: 'Failed to load listing details.' });
  }
});

// User My Listings
app.get('/api/user/listings', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listings = (await db.prepare('SELECT * FROM listings WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id)).map((item: any) => ({
      ...item,
      images: item.images_json ? JSON.parse(item.images_json) : [],
      skins: item.skins_json ? JSON.parse(item.skins_json) : []
    }));

    res.json({ listings });
  } catch (err) {
    console.error('Fetch user listings error:', err);
    res.status(500).json({ error: 'Failed to load your listings.' });
  }
});

// Create / Submit a Listing
app.post('/api/user/listings', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rank = req.body.rank || req.body.rank_tier;
    const level = req.body.level || req.body.account_level || 1;
    const vip_plan = req.body.vip_plan || req.body.vip_plan_id || 'none';
    const { title, description, price_inr, peak_rank, region, skin_count, knife_count, images, skins, submitForReview, status } = req.body;

    if (!title || !price_inr || !rank) {
      res.status(400).json({ error: 'Listing title, price, and competitive rank are mandatory.' });
      return;
    }

    const listingId = 'lst_' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();
    const initialStatus = (submitForReview || status === 'submitted' || status === 'pending_review') ? 'submitted' : 'draft';

    await db.prepare(`
      INSERT INTO listings (
        id, user_id, seller_name, seller_role, guarantee_type, title, description,
        price_inr, rank, peak_rank, level, region, skin_count, knife_count, featured,
        vip_plan, images_json, skins_json, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'community', 'escrow_protected', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
    `).run(
      listingId,
      req.user!.id,
      req.user!.name,
      title,
      description || '',
      Number(price_inr),
      rank,
      peak_rank || rank,
      Number(level) || 1,
      region || 'AP / Mumbai',
      Number(skin_count) || (Array.isArray(skins) ? skins.length : 0),
      Number(knife_count) || 0,
      vip_plan || 'none',
      JSON.stringify(images || []),
      JSON.stringify(skins || []),
      initialStatus,
      now,
      now
    );

    const row = await db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);

    res.status(201).json({
      message: initialStatus === 'submitted'
        ? 'Listing submitted successfully! Our compliance desk will review and publish it.'
        : 'Listing draft saved successfully.',
      listingId,
      listing: row
    });
  } catch (err) {
    console.error('Create user listing error:', err);
    res.status(500).json({ error: 'Failed to save listing.' });
  }
});

// User Edit Listing
app.put('/api/user/listings/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listingId = req.params.id;
    const existing = await db.prepare('SELECT * FROM listings WHERE id = ? AND user_id = ?').get(listingId, req.user!.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Listing not found or you do not have permission to edit it.' });
      return;
    }

    const { title, description, price_inr, rank, peak_rank, level, region, skin_count, knife_count, images, skins, submitForReview } = req.body;
    const updatedTitle = title !== undefined ? title : existing.title;
    const updatedDesc = description !== undefined ? description : existing.description;
    const updatedPrice = price_inr !== undefined ? Number(price_inr) : existing.price_inr;
    const updatedRank = rank !== undefined ? rank : existing.rank;
    const updatedPeakRank = peak_rank !== undefined ? peak_rank : existing.peak_rank;
    const updatedLevel = level !== undefined ? Number(level) : existing.level;
    const updatedRegion = region !== undefined ? region : existing.region;
    const updatedSkinCount = skin_count !== undefined ? Number(skin_count) : existing.skin_count;
    const updatedKnifeCount = knife_count !== undefined ? Number(knife_count) : existing.knife_count;
    const updatedImages = images !== undefined ? JSON.stringify(images) : existing.images_json;
    const updatedSkins = skins !== undefined ? JSON.stringify(skins) : existing.skins_json;

    let newStatus = existing.status;
    if (submitForReview) {
      newStatus = 'submitted';
    }

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE listings
      SET title = ?, description = ?, price_inr = ?, rank = ?, peak_rank = ?,
          level = ?, region = ?, skin_count = ?, knife_count = ?,
          images_json = ?, skins_json = ?, status = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      updatedTitle, updatedDesc, updatedPrice, updatedRank, updatedPeakRank,
      updatedLevel, updatedRegion, updatedSkinCount, updatedKnifeCount,
      updatedImages, updatedSkins, newStatus, now,
      listingId, req.user!.id
    );

    const updated = await db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId) as any;
    res.json({
      message: submitForReview ? 'Listing updated and submitted for review.' : 'Listing updated successfully.',
      listing: {
        ...updated,
        images: updated.images_json ? JSON.parse(updated.images_json) : [],
        skins: updated.skins_json ? JSON.parse(updated.skins_json) : []
      }
    });
  } catch (err) {
    console.error('Edit user listing error:', err);
    res.status(500).json({ error: 'Failed to update listing.' });
  }
});

// User Delete/Withdraw Listing
app.delete('/api/user/listings/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listingId = req.params.id;
    const existing = await db.prepare('SELECT * FROM listings WHERE id = ? AND user_id = ?').get(listingId, req.user!.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Listing not found or you do not have permission to delete it.' });
      return;
    }

    await db.prepare('DELETE FROM listings WHERE id = ? AND user_id = ?').run(listingId, req.user!.id);
    res.json({ message: 'Listing withdrawn successfully.', listingId });
  } catch (err) {
    console.error('Delete user listing error:', err);
    res.status(500).json({ error: 'Failed to withdraw listing.' });
  }
});

// Admin Listings Review Queue
app.get('/api/admin/listings', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM listings WHERE 1=1';
    const params: any[] = [];

    if (status) {
      if (status === 'submitted' || status === 'pending_review') {
        query += " AND (status = 'submitted' OR status = 'pending_review')";
      } else {
        query += ' AND status = ?';
        params.push(status);
      }
    }
    query += ' ORDER BY created_at DESC LIMIT 100';

    const listings = (await db.prepare(query).all(...params)).map((item: any) => ({
      ...item,
      images: item.images_json ? JSON.parse(item.images_json) : [],
      skins: item.skins_json ? JSON.parse(item.skins_json) : []
    }));

    res.json({ listings });
  } catch (err) {
    console.error('Admin listings fetch error:', err);
    res.status(500).json({ error: 'Failed to load admin listings.' });
  }
});

// Admin Directly Create & Publish Normal Account Listing
app.post('/api/admin/listings', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description = '',
      price_inr,
      rank,
      peak_rank,
      level = 1,
      region = 'Asia Pacific (Mumbai)',
      guarantee_type = 'escrow_protected',
      seller_name,
      seller_role = 'admin',
      featured = false,
      vip_plan = 'none',
      skin_count,
      knife_count = 0,
      images = [],
      skins = [],
      status = 'published',
      inquiry_contact = 'teamvibofficial@gmail.com'
    } = req.body || {};

    if (!title || !price_inr || !rank) {
      res.status(400).json({ error: 'Title, price in INR, and competitive rank are mandatory fields.' });
      return;
    }

    const listingId = 'lst_' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();

    const resolvedSellerName = (seller_name && String(seller_name).trim()) || req.user?.name || 'VIB Official Vault';
    const normalizedGuarantee =
      guarantee_type === 'guaranteed' ? 'lifetime_guaranteed' : String(guarantee_type || 'escrow_protected').trim();
    const parsedPrice = Number(price_inr);
    const parsedLevel = Math.max(1, parseInt(String(level), 10) || 1);
    const parsedSkins = Array.isArray(skins) ? skins : [];
    const parsedImages = Array.isArray(images) ? images : [];
    const resolvedSkinCount = Number(skin_count) || parsedSkins.length;
    const resolvedKnifeCount = Number(knife_count) || 0;

    await db.prepare(`
      INSERT INTO listings (
        id, user_id, seller_name, seller_role, guarantee_type, title, description,
        price_inr, rank, peak_rank, level, region, skin_count, knife_count, featured,
        vip_plan, images_json, skins_json, status, inquiry_contact, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      listingId,
      req.user!.id,
      resolvedSellerName,
      seller_role,
      normalizedGuarantee,
      String(title).trim(),
      String(description).trim(),
      parsedPrice,
      String(rank).trim(),
      String(peak_rank || rank).trim(),
      parsedLevel,
      String(region).trim(),
      resolvedSkinCount,
      resolvedKnifeCount,
      featured ? 1 : 0,
      vip_plan,
      JSON.stringify(parsedImages),
      JSON.stringify(parsedSkins),
      status,
      String(inquiry_contact).trim(),
      now,
      now
    );

    // Record in audit log
    await logAudit(req.user!.id, req.user!.name, 'CREATE_MARKETPLACE_LISTING', 'listing', listingId, {
      title,
      status,
      price: parsedPrice
    }, req.ip || '127.0.0.1');

    const created = await db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId) as any;
    res.status(201).json({
      message: `Marketplace listing "${title}" successfully created and set to ${status}.`,
      listing: {
        ...created,
        images: parsedImages,
        skins: parsedSkins
      }
    });
  } catch (err: any) {
    console.error('Admin create listing error:', err);
    res.status(500).json({ error: 'Failed to create marketplace account listing.' });
  }
});

// Admin Approve, Reject, or Publish Listing
app.put('/api/admin/listings/:id/status', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listingId = req.params.id;
    const { status, featured } = req.body;
    const reason = req.body.reason || req.body.reject_reason || req.body.rejection_reason || null;

    const validStatuses = ['approved', 'published', 'hidden', 'rejected', 'archived', 'draft', 'pending_review', 'submitted'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid listing status: ${status}` });
      return;
    }

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE listings SET
        status = ?,
        rejection_reason = ?,
        featured = COALESCE(?, featured),
        updated_at = ?
      WHERE id = ?
    `).run(status, reason || null, featured !== undefined ? (featured ? 1 : 0) : null, now, listingId);

    await logAudit(req.user!.id, req.user!.name, 'UPDATE_LISTING_STATUS', 'listings', listingId, { status, reason }, req.ip || '127.0.0.1');

    const updated = await db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
    res.json({ message: `Listing status updated to ${status}.`, listing: updated });
  } catch (err) {
    console.error('Update listing status error:', err);
    res.status(500).json({ error: 'Failed to update listing status.' });
  }
});

// Admin / Staff Edit All Listing Details
app.put('/api/admin/listings/:id', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listingId = req.params.id;
    const existing = await db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    const {
      title,
      description,
      price_inr,
      rank,
      peak_rank,
      level,
      region,
      skin_count,
      knife_count,
      featured,
      vip_plan,
      images,
      skins,
      seller_role,
      guarantee_type,
      status,
      rejection_reason,
    } = req.body;

    const updatedTitle = title !== undefined ? String(title).trim() : existing.title;
    const updatedDesc = description !== undefined ? String(description).trim() : existing.description;
    const updatedPrice = price_inr !== undefined ? Number(price_inr) : existing.price_inr;
    const updatedRank = rank !== undefined ? String(rank).trim() : existing.rank;
    const updatedPeakRank = peak_rank !== undefined ? String(peak_rank).trim() : existing.peak_rank;
    const updatedLevel = level !== undefined ? Number(level) : existing.level;
    const updatedRegion = region !== undefined ? String(region).trim() : existing.region;
    const updatedSkinCount = skin_count !== undefined ? Number(skin_count) : existing.skin_count;
    const updatedKnifeCount = knife_count !== undefined ? Number(knife_count) : existing.knife_count;
    const updatedFeatured = featured !== undefined ? (featured ? 1 : 0) : existing.featured;
    const updatedVipPlan = vip_plan !== undefined ? String(vip_plan).trim() : existing.vip_plan;
    const updatedImages = images !== undefined ? JSON.stringify(images) : existing.images_json;
    const updatedSkins = skins !== undefined ? JSON.stringify(skins) : existing.skins_json;
    const updatedSellerRole = seller_role !== undefined ? String(seller_role).trim() : existing.seller_role;
    const updatedGuaranteeRaw = guarantee_type !== undefined ? String(guarantee_type).trim() : existing.guarantee_type;
    const updatedGuarantee = updatedGuaranteeRaw === 'guaranteed' ? 'lifetime_guaranteed' : updatedGuaranteeRaw;
    const updatedStatus = status !== undefined ? String(status).trim() : existing.status;
    const updatedReason = rejection_reason !== undefined ? rejection_reason : existing.rejection_reason;

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE listings SET
        title = ?,
        description = ?,
        price_inr = ?,
        rank = ?,
        peak_rank = ?,
        level = ?,
        region = ?,
        skin_count = ?,
        knife_count = ?,
        featured = ?,
        vip_plan = ?,
        images_json = ?,
        skins_json = ?,
        seller_role = ?,
        guarantee_type = ?,
        status = ?,
        rejection_reason = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      updatedTitle,
      updatedDesc,
      updatedPrice,
      updatedRank,
      updatedPeakRank,
      updatedLevel,
      updatedRegion,
      updatedSkinCount,
      updatedKnifeCount,
      updatedFeatured,
      updatedVipPlan,
      updatedImages,
      updatedSkins,
      updatedSellerRole,
      updatedGuarantee,
      updatedStatus,
      updatedReason,
      now,
      listingId
    );

    await logAudit(req.user!.id, req.user!.name, 'ADMIN_EDIT_LISTING', 'listings', listingId, { title: updatedTitle, price: updatedPrice }, req.ip || '127.0.0.1');

    const updated = await db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId) as any;
    res.json({
      message: 'Listing updated successfully by administration.',
      listing: {
        ...updated,
        images: updated.images_json ? JSON.parse(updated.images_json) : [],
        skins: updated.skins_json ? JSON.parse(updated.skins_json) : [],
      },
    });
  } catch (err) {
    console.error('Admin edit listing error:', err);
    res.status(500).json({ error: 'Failed to update listing.' });
  }
});

// Admin Delete Listing
app.delete('/api/admin/listings/:id', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listingId = req.params.id;
    const existing = await db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    await db.prepare('DELETE FROM listings WHERE id = ?').run(listingId);
    await logAudit(req.user!.id, req.user!.name, 'ADMIN_DELETE_LISTING', 'listings', listingId, { title: existing.title }, req.ip || '127.0.0.1');
    res.json({ message: 'Listing permanently removed by administrator.', listingId });
  } catch (err) {
    console.error('Admin delete listing error:', err);
    res.status(500).json({ error: 'Failed to delete listing.' });
  }
});

// VIP Plans List
app.get('/api/vip-plans', async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = (await db.prepare('SELECT * FROM vip_plans WHERE active = 1').all()).map((p: any) => ({
      ...p,
      features: JSON.parse(p.features_json)
    }));
    res.json({ plans });
  } catch (err) {
    console.error('Fetch VIP plans error:', err);
    res.status(500).json({ error: 'Failed to load VIP plans.' });
  }
});

// ==========================================
// 21. VALORANT SKIN CATALOG & MEDIA
// ==========================================

app.get('/api/skins', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, weapon, collection, limit } = req.query;
    let query = 'SELECT * FROM skins WHERE active = 1';
    const params: any[] = [];

    if (search) {
      query += ' AND (name LIKE ? OR collection LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (weapon) {
      query += ' AND weapon = ?';
      params.push(weapon);
    }
    if (collection) {
      query += ' AND collection = ?';
      params.push(collection);
    }

    const maxLimit = limit ? Math.min(Number(limit) || 100, 2500) : 2000;
    query += ` ORDER BY collection ASC, name ASC LIMIT ${maxLimit}`;

    const skins = (await db.prepare(query).all(...params)).map((s: any) => ({
      ...s,
      variants: s.variants_json ? JSON.parse(s.variants_json) : []
    }));

    res.json({ skins });
  } catch (err) {
    console.error('Fetch skins error:', err);
    res.status(500).json({ error: 'Failed to load skins catalog.' });
  }
});

app.get('/api/skins/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const skin = await db.prepare('SELECT * FROM skins WHERE id = ?').get(req.params.id) as any;
    if (!skin) {
      res.status(404).json({ error: 'Skin not found.' });
      return;
    }
    res.json({
      skin: {
        ...skin,
        variants: skin.variants_json ? JSON.parse(skin.variants_json) : []
      }
    });
  } catch (err) {
    console.error('Fetch skin detail error:', err);
    res.status(500).json({ error: 'Failed to load skin details.' });
  }
});

// Admin Sync Official Valorant Skins from API
app.post('/api/admin/skins/sync', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await syncOfficialValorantSkins();
    res.json({ message: `Successfully synced ${count} official Valorant skins from API.`, count });
  } catch (err) {
    console.error('Skins sync error:', err);
    res.status(500).json({ error: 'Failed to sync Valorant skins.' });
  }
});

// ==========================================
// 22. EMAIL AUTOMATION DIAGNOSTICS & LOGS
// ==========================================

app.get('/api/admin/email-logs', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await db.prepare('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 100').all();
    res.json({ logs });
  } catch (err) {
    console.error('Fetch email logs error:', err);
    res.status(500).json({ error: 'Failed to load email logs.' });
  }
});

app.post('/api/admin/email/test', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { recipient, email } = req.body;
    const target = recipient || email || 'thevibofficial@gmail.com';

    const result = await sendEmail({
      to: target,
      subject: '[VIB Diagnostic Test] Automated Email Verification',
      html: `
        <div style="font-family: Arial; padding: 20px; background: #07070d; color: #fff;">
          <h2 style="color: #a855f7;">VIB Email Service Test</h2>
          <p>This is a diagnostic test message dispatched from the VIB Digital Services Platform by ${req.user!.name}.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
      `,
      templateName: 'diagnostic_test'
    });

    res.json({ message: 'Diagnostic test executed.', success: result.success, result });
  } catch (err) {
    console.error('Email diagnostic error:', err);
    res.status(500).json({ error: 'Failed to send diagnostic email.' });
  }
});

app.post('/api/admin/email-logs/:id/retry', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const log = await db.prepare('SELECT * FROM email_logs WHERE id = ?').get(req.params.id) as any;
    if (!log) {
      res.status(404).json({ error: 'Email log not found.' });
      return;
    }

    const result = await sendEmail({
      to: log.recipient,
      subject: `[RETRY] ${log.subject}`,
      html: `<p>Retried message: ${log.subject}</p>`,
      templateName: log.template_name
    });

    await db.prepare('UPDATE email_logs SET retry_count = retry_count + 1 WHERE id = ?').run(req.params.id);

    res.json({ message: 'Email retry dispatched.', result });
  } catch (err) {
    console.error('Email retry error:', err);
    res.status(500).json({ error: 'Failed to retry email delivery.' });
  }
});

// Admin Email Composer: Send to specific user, segment, or all users
app.post('/api/admin/email/compose', authenticate, staffOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { recipient_type, specific_email, segment, subject, html_content, text_content } = req.body || {};

    if (!subject || !html_content) {
      res.status(400).json({ error: 'Subject and email content are required.' });
      return;
    }

    let recipients: string[] = [];

    if (recipient_type === 'specific') {
      if (!specific_email || !specific_email.includes('@')) {
        res.status(400).json({ error: 'Valid recipient email address is required.' });
        return;
      }
      recipients = [specific_email.trim()];
    } else if (recipient_type === 'segment') {
      if (segment === 'buyers') {
        const rows = await db.prepare("SELECT DISTINCT u.email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.user_id IS NOT NULL").all() as any[];
        recipients = rows.map(r => r.email).filter(Boolean);
      } else if (segment === 'renters') {
        const rows = await db.prepare("SELECT DISTINCT u.email FROM rental_bookings rb JOIN users u ON rb.user_id = u.id").all() as any[];
        recipients = rows.map(r => r.email).filter(Boolean);
      } else if (segment === 'bidders') {
        const rows = await db.prepare("SELECT DISTINCT u.email FROM auction_bids ab JOIN users u ON u.id = ab.user_id").all() as any[];
        recipients = rows.map(r => r.email).filter(Boolean);
      } else if (segment === 'users') {
        // All non-staff registered users
        const rows = await db.prepare("SELECT email FROM users WHERE role IN ('user','seller') AND email IS NOT NULL").all() as any[];
        recipients = rows.map(r => r.email).filter(Boolean);
      } else {
        // Fallback: all non-staff registered users
        const rows = await db.prepare("SELECT email FROM users WHERE role IN ('user','seller') AND email IS NOT NULL").all() as any[];
        recipients = rows.map(r => r.email).filter(Boolean);
      }
    } else {
      // 'all' registered users
      const rows = await db.prepare("SELECT email FROM users WHERE email IS NOT NULL").all() as any[];
      recipients = rows.map(r => r.email).filter(Boolean);
    }

    // Deduplicate emails
    recipients = Array.from(new Set(recipients));

    if (recipients.length === 0) {
      res.status(400).json({ error: 'No matching recipients found for the selected audience.' });
      return;
    }

    let deliveredCount = 0;
    let failedCount = 0;

    for (const email of recipients) {
      const res = await sendEmail({
        to: email,
        subject,
        html: html_content,
        text: text_content || subject,
        templateName: 'admin_broadcast',
        context: { sender: req.user!.name, recipient_type, segment }
      });
      if (res.success) deliveredCount++;
      else failedCount++;
    }

    await logAudit(req.user!.id, req.user!.name, 'DISPATCH_BROADCAST_EMAIL', 'email', 'broadcast', {
      subject,
      recipient_type,
      segment,
      total_recipients: recipients.length,
      delivered: deliveredCount,
      failed: failedCount
    }, req);

    res.json({
      message: `Broadcast completed. Dispatched to ${deliveredCount} recipient(s).`,
      total: recipients.length,
      delivered: deliveredCount,
      failed: failedCount
    });
  } catch (err: any) {
    console.error('Email compose error:', err);
    res.status(500).json({ error: 'Failed to dispatch email campaign.' });
  }
});

// ==========================================
// 23. LIVE AUCTION HOUSE, RENTALS & LEGAL OVERHAUL ENGINE
// ==========================================

registerOverhaulRoutes(app, db, authenticate, staffOnly, adminOnly);
registerAdvertisementRoutes(app, db, authenticate, adminOnly);

// ==========================================
// 24. KYC VERIFICATION & EMI FINANCING HOOKS
// ==========================================
registerKycRoutes(app, {
  authenticate,
  staffOnly,
  adminOnly,
  superAdminOnly,
  sendEmail,
  isEmailConfigured,
  logAudit
});
registerEmiRoutes(app, {
  authenticate,
  staffOnly,
  adminOnly,
  superAdminOnly,
  sendEmail,
  isEmailConfigured,
  logAudit
});

// Start Express Server
if (!process.env.VERCEL) {
  ensureDbReady()
    .then(() => {
      syncOfficialValorantSkins().catch((e) => console.warn('[Skins Sync] Initial sync deferred:', e.message));
      app.listen(PORT, () => {
        console.log(`[VIB Server] Production Backend running at http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[Startup Error] Failed to initialize database:', err);
      process.exit(1);
    });
}

export default app;
