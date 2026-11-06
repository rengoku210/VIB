import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { VALORANT_RANKS } from '../src/data/rank-pricing.js';

const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel ? '/tmp/data' : path.resolve(process.cwd(), 'data');
const dbPath = process.env.VIB_DATABASE_PATH
  ? path.resolve(process.env.VIB_DATABASE_PATH)
  : path.join(dataDir, 'vib.db');
export const databaseDirectory = path.dirname(dbPath);
if (!fs.existsSync(databaseDirectory)) {
  fs.mkdirSync(databaseDirectory, { recursive: true });
}

// If running in Vercel serverless environment, copy the canonical repository database template if /tmp/data/vib.db does not exist yet
if (isVercel && !fs.existsSync(dbPath)) {
  const templateDb = path.resolve(process.cwd(), 'data', 'vib.db');
  if (fs.existsSync(templateDb)) {
    try {
      fs.copyFileSync(templateDb, dbPath);
      console.log(`[Database] Successfully copied canonical template database to ${dbPath}`);
    } catch (err) {
      console.warn('[Database] Warning: Failed to copy template database to /tmp:', err);
    }
  }
}

export const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency (or MEMORY journal on Vercel read-only serverless filesystem)
if (isVercel) {
  db.exec('PRAGMA journal_mode = MEMORY;');
} else {
  db.exec('PRAGMA journal_mode = WAL;');
}
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    riot_id TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    email_verified INTEGER DEFAULT 1,
    verification_code TEXT,
    reset_token TEXT,
    reset_token_expires_at TEXT,
    terms_accepted_at TEXT,
    terms_version TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY,
    bio TEXT,
    avatar TEXT,
    discord_tag TEXT,
    wallet_balance REAL DEFAULT 0,
    kyc_status TEXT DEFAULT 'unverified',
    total_orders INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    details_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    order_id TEXT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    reference_no TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    messages_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details_json TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    price_inr REAL NOT NULL,
    original_price_inr REAL,
    badge TEXT,
    description TEXT,
    details_json TEXT,
    stock INTEGER DEFAULT -1,
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_messages (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    message TEXT NOT NULL,
    attachment_url TEXT,
    flagged INTEGER DEFAULT 0,
    flag_reason TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    billing_address TEXT,
    seller_name TEXT,
    product_name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    platform_fee REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    final_total REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'paid',
    payment_method TEXT NOT NULL,
    payment_reference TEXT,
    notes TEXT,
    invoice_date TEXT NOT NULL,
    due_date TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    payment_method TEXT NOT NULL,
    reference_no TEXT,
    recorded_by TEXT NOT NULL,
    expense_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS staff_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    department TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    assigned_to TEXT,
    created_by TEXT NOT NULL,
    due_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_crm_notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    note TEXT NOT NULL,
    risk_level TEXT DEFAULT 'low',
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS email_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    body TEXT NOT NULL,
    variables_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payment_settings (
    id TEXT PRIMARY KEY,
    upi_id TEXT NOT NULL,
    payee_name TEXT NOT NULL,
    qr_image_url TEXT NOT NULL,
    instructions TEXT NOT NULL,
    currency TEXT DEFAULT 'INR',
    support_whatsapp TEXT DEFAULT '+919181801766',
    support_email TEXT DEFAULT 'thevibofficial@gmail.com',
    manual_payment_enabled INTEGER DEFAULT 1,
    verification_instructions TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vp_codes (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'available',
    order_id TEXT,
    reserved_at TEXT,
    issued_at TEXT,
    batch_no TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_vp_codes_pkg_status ON vp_codes(package_id, status);

  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    seller_role TEXT DEFAULT 'community',
    guarantee_type TEXT DEFAULT 'escrow_protected',
    title TEXT NOT NULL,
    description TEXT,
    price_inr REAL NOT NULL,
    rank TEXT NOT NULL,
    peak_rank TEXT,
    level INTEGER DEFAULT 1,
    region TEXT DEFAULT 'AP / Mumbai',
    skin_count INTEGER DEFAULT 0,
    knife_count INTEGER DEFAULT 0,
    featured INTEGER DEFAULT 0,
    vip_plan TEXT DEFAULT 'none',
    vip_expires_at TEXT,
    images_json TEXT,
    skins_json TEXT,
    status TEXT DEFAULT 'draft',
    rejection_reason TEXT,
    inquiry_contact TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);

  CREATE TABLE IF NOT EXISTS vip_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    price_inr REAL NOT NULL,
    badge_label TEXT NOT NULL,
    features_json TEXT NOT NULL,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS skins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    weapon TEXT NOT NULL,
    collection TEXT NOT NULL,
    tier TEXT DEFAULT 'Exclusive',
    image_url TEXT NOT NULL,
    video_url TEXT,
    variants_json TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_skins_weapon ON skins(weapon);
  CREATE INDEX IF NOT EXISTS idx_skins_collection ON skins(collection);

  CREATE TABLE IF NOT EXISTS email_logs (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_name TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    context_json TEXT,
    sent_at TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS auction_lots (
    id TEXT PRIMARY KEY,
    lot_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    starting_bid REAL NOT NULL,
    current_bid REAL NOT NULL,
    bid_increment REAL DEFAULT 150,
    bid_count INTEGER DEFAULT 0,
    highest_bidder_id TEXT,
    highest_bidder_name TEXT,
    ends_at TEXT NOT NULL,
    image_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auction_bids (
    id TEXT PRIMARY KEY,
    lot_id TEXT NOT NULL,
    user_id TEXT,
    bidder_name TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'winning',
    deposit_required REAL DEFAULT 0,
    deposit_paid REAL DEFAULT 0,
    deposit_status TEXT DEFAULT 'held',
    deposit_tx_id TEXT,
    deposit_refund_tx_id TEXT,
    deposit_refunded_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY(lot_id) REFERENCES auction_lots(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_auction_bids_lot ON auction_bids(lot_id);

  CREATE TABLE IF NOT EXISTS auction_deposits (
    id TEXT PRIMARY KEY,
    lot_id TEXT NOT NULL,
    bid_id TEXT,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'upi',
    gateway_ref TEXT,
    status TEXT DEFAULT 'held',
    refund_amount REAL DEFAULT 0,
    refund_ref TEXT,
    refund_reason TEXT,
    created_at TEXT NOT NULL,
    settled_at TEXT,
    FOREIGN KEY(lot_id) REFERENCES auction_lots(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_auction_deposits_lot ON auction_deposits(lot_id);
  CREATE INDEX IF NOT EXISTS idx_auction_deposits_user ON auction_deposits(user_id);

  CREATE TABLE IF NOT EXISTS rental_listings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    gallery_json TEXT DEFAULT '[]',
    account_identifier TEXT,
    rank TEXT DEFAULT 'Ascendant',
    region TEXT DEFAULT 'AP / Mumbai',
    featured_skins_json TEXT DEFAULT '[]',
    price_24h REAL NOT NULL,
    price_3d REAL NOT NULL,
    price_7d REAL NOT NULL,
    price_30d REAL NOT NULL,
    security_deposit REAL DEFAULT 0,
    terms_conditions TEXT,
    status TEXT DEFAULT 'available',
    current_rental_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_rental_status ON rental_listings(status);

  CREATE TABLE IF NOT EXISTS rental_bookings (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    order_id TEXT,
    duration TEXT NOT NULL,
    price_inr REAL NOT NULL,
    deposit_inr REAL DEFAULT 0,
    total_paid REAL NOT NULL,
    status TEXT DEFAULT 'pending_approval',
    credentials_vault_json TEXT,
    starts_at TEXT,
    expires_at TEXT,
    renewals_count INTEGER DEFAULT 0,
    admin_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(listing_id) REFERENCES rental_listings(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_rental_bookings_user ON rental_bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_rental_bookings_listing ON rental_bookings(listing_id);

  CREATE TABLE IF NOT EXISTS legal_policies (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    current_version TEXT NOT NULL DEFAULT '1.0',
    status TEXT DEFAULT 'published',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS legal_policy_versions (
    id TEXT PRIMARY KEY,
    policy_id TEXT NOT NULL,
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    content_md TEXT NOT NULL,
    summary_of_changes TEXT,
    effective_date TEXT NOT NULL,
    published_at TEXT NOT NULL,
    published_by TEXT NOT NULL,
    status TEXT DEFAULT 'published',
    created_at TEXT NOT NULL,
    FOREIGN KEY(policy_id) REFERENCES legal_policies(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_legal_policy_versions ON legal_policy_versions(policy_id, version);

  CREATE TABLE IF NOT EXISTS user_consents (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    policy_id TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    consent_type TEXT NOT NULL,
    context_type TEXT,
    context_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_consents_policy ON user_consents(policy_id);
`);

// Safe column migrations
// Older login audit rows stored the bearer token as the target identifier. Keep the
// audit event while replacing that secret with the actor's stable user ID.
db.prepare(`
  UPDATE audit_logs
  SET target_id = actor_id
  WHERE target_type = 'session'
    AND action IN ('USER_LOGIN', 'FIREBASE_GOOGLE_LOGIN')
    AND target_id != actor_id
`).run();

try {
  db.exec('ALTER TABLE users ADD COLUMN firebase_uid TEXT');
} catch {}
try {
  db.exec("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'");
} catch {}
try {
  db.exec('ALTER TABLE users ADD COLUMN riot_verified INTEGER DEFAULT 0');
} catch {}
try { db.exec('ALTER TABLE users ADD COLUMN terms_accepted_at TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN terms_version TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN reset_token_expires_at TEXT'); } catch {}

// Order Workflow & Manual Payment Safe Column Migrations
try { db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'AWAITING_PAYMENT'"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN fulfillment_status TEXT DEFAULT 'PENDING'"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN payment_evidence_ref TEXT"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN payment_evidence_image TEXT"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN admin_notes TEXT"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN verified_by TEXT"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN verified_at TEXT"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN timeline_json TEXT"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN issued_code TEXT"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN code_issued_at TEXT"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN regional_notes TEXT"); } catch {}

// A completed order with a successful transaction and paid invoice must not be
// presented as awaiting payment or pending fulfillment. Repair those legacy rows
// only when both linked accounting records independently confirm the payment.
db.prepare(`
  UPDATE orders
  SET payment_status = 'PAYMENT_VERIFIED'
  WHERE status = 'completed'
    AND payment_status = 'AWAITING_PAYMENT'
    AND EXISTS (SELECT 1 FROM transactions t WHERE t.order_id = orders.id AND t.status = 'success')
    AND EXISTS (SELECT 1 FROM invoices i WHERE i.order_id = orders.id AND i.status = 'paid')
`).run();
db.prepare(`
  UPDATE orders SET fulfillment_status = 'COMPLETED'
  WHERE status = 'completed'
    AND payment_status = 'PAYMENT_VERIFIED'
    AND fulfillment_status = 'PENDING'
`).run();
db.prepare(`
  UPDATE transactions
  SET status = 'pending'
  WHERE status = 'success'
    AND order_id IN (
      SELECT id FROM orders
      WHERE payment_status IN ('AWAITING_PAYMENT', 'SUBMITTED_FOR_VERIFICATION', 'PAYMENT_REJECTED')
    )
`).run();
db.prepare(`
  UPDATE invoices
  SET status = 'pending'
  WHERE status = 'paid'
    AND order_id IN (
      SELECT id FROM orders
      WHERE payment_status IN ('AWAITING_PAYMENT', 'SUBMITTED_FOR_VERIFICATION', 'PAYMENT_REJECTED')
    )
`).run();
db.prepare(`
  UPDATE orders
  SET status = 'pending'
  WHERE status = 'processing'
    AND fulfillment_status = 'PENDING'
    AND payment_status IN ('AWAITING_PAYMENT', 'SUBMITTED_FOR_VERIFICATION', 'PAYMENT_REJECTED')
`).run();

// Riot ID Verification Registry Cache Table
db.exec(`
  CREATE TABLE IF NOT EXISTS riot_accounts (
    id TEXT PRIMARY KEY,
    game_name TEXT NOT NULL COLLATE NOCASE,
    tag_line TEXT NOT NULL COLLATE NOCASE,
    riot_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
    puuid TEXT,
    region TEXT DEFAULT 'global',
    account_level INTEGER DEFAULT 1,
    card_small TEXT,
    verified INTEGER DEFAULT 1,
    source TEXT DEFAULT 'verified',
    verified_at TEXT NOT NULL,
    last_checked_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_riot_id ON riot_accounts(riot_id);
  CREATE INDEX IF NOT EXISTS idx_riot_name_tag ON riot_accounts(game_name, tag_line);
`);


// Password hashing utility using scrypt
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

if ((process.env.NODE_ENV === 'production' || process.env.VERCEL) && !process.env.SESSION_SECRET) {
  console.warn('[Security Warning] SESSION_SECRET environment variable is not set on Vercel/Production. Using default platform session secret.');
}
const TOKEN_SECRET = process.env.SESSION_SECRET || 'vib-platform-production-fallback-secret-2026';

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  exp: number;
  iat: number;
}

export function createSignedToken(payload: {
  id: string;
  email: string;
  name: string;
  role: string;
  status?: string;
}): string {
  const data: TokenPayload = {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    status: payload.status || 'active',
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    iat: Date.now(),
  };
  const encodedData = Buffer.from(JSON.stringify(data)).toString('base64url');
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedData).digest('base64url');
  return `${encodedData}.${hmac}`;
}

export function verifySignedToken(token: string): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedData, signature] = parts;
  if (!encodedData || !signature) return null;

  try {
    const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedData).digest('base64url');
    if (signature.length !== expectedSignature.length) return null;

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const payload = JSON.parse(Buffer.from(encodedData, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload.id || !payload.role) return null;
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function generateToken(user?: { id: string; email: string; name: string; role: string; status?: string }): string {
  if (user) {
    return createSignedToken(user);
  }
  return crypto.randomBytes(32).toString('hex');
}

// Seed default accounts if database is empty
export function seedDatabase() {
  const checkUserStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const result = checkUserStmt.get() as { count: number };

  if (result.count === 0) {
    console.log('[Database] Seeding default accounts...');
    const now = new Date().toISOString();

    // 1. Super Admin
    const adminPass = hashPassword('AdminPassword@123');
    const adminId = 'usr_superadmin_01';
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, phone, riot_id, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      'admin@vib.gg',
      adminPass.hash,
      adminPass.salt,
      'VIB Executive Superadmin',
      '+91 91818 01766',
      'VIB_Director#EXEC',
      'superadmin',
      'active',
      1,
      now,
      now
    );

    db.prepare(`
      INSERT INTO profiles (user_id, bio, avatar, discord_tag, wallet_balance, kyc_status, total_orders, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      'Chief Operations & Security Officer for VIB Digital Services Platform.',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      'VIB_Director#0001',
      50000.0,
      'verified',
      128,
      now
    );

    // Initial Audit Log
    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_name, action, target_type, target_id, details_json, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'audit_001',
      adminId,
      'VIB Executive Superadmin',
      'INITIALIZE_SYSTEM',
      'system',
      'vib_platform',
      JSON.stringify({ status: 'Operational', securityProtocol: 'v2.4' }),
      '127.0.0.1',
      now
    );

    console.log('[Database] Seeding default accounts completed.');
  }

  seedCatalogAndBilling();
}

export function seedCatalogAndBilling() {
  const now = new Date().toISOString();

  // 1. Seed Products if empty
  const productCount = (db.prepare('SELECT COUNT(*) as count FROM products').get() as any).count;
  if (productCount === 0) {
    console.log('[Database] Seeding real catalog products...');
    const insertProduct = db.prepare(`
      INSERT INTO products (id, title, category, price_inr, original_price_inr, badge, description, details_json, stock, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const products = [
      { id: 'vp-475', title: '475 Valorant Points Pack', category: 'vp', price: 499, orig: 599, badge: 'POPULAR', desc: 'Viper tier quick top-up pack with instant Riot PIN redemption.', details: { vp: 475, agent: 'VIPER', delivery: 'Instant PIN / Direct Top-Up' } },
      { id: 'vp-1000', title: '1,000 Valorant Points Pack', category: 'vp', price: 999, orig: 1199, badge: 'HOT', desc: 'Neon tier battlepass unlock pack with bioelectric delivery speed.', details: { vp: 1000, agent: 'NEON', delivery: 'Instant PIN' } },
      { id: 'vp-2050', title: '2,050 Valorant Points Pack', category: 'vp', price: 1999, orig: 2399, badge: 'POPULAR', desc: 'Phoenix tier premium skins top-up with bonus VP points.', details: { vp: 2050, agent: 'PHOENIX', delivery: 'Instant PIN' } },
      { id: 'vp-3650', title: '3,650 Valorant Points Pack', category: 'vp', price: 3499, orig: 4199, badge: 'BEST VALUE', desc: 'Jett tier exclusive collection pack for premium weapon skins.', details: { vp: 3650, agent: 'JETT', delivery: 'Instant PIN' } },
      { id: 'vp-5350', title: '5,350 Valorant Points Pack', category: 'vp', price: 4999, orig: 5999, badge: 'EPIC', desc: 'Chamber tier luxury bundle pack for elite collectors.', details: { vp: 5350, agent: 'CHAMBER', delivery: 'Instant Direct Riot Top-Up' } },
      { id: 'vp-7400', title: '7,400 Valorant Points Pack', category: 'vp', price: 6199, orig: 7199, badge: 'HOT', desc: 'Sova tier reconnaissance master pack with instant Riot PIN redemption.', details: { vp: 7400, agent: 'SOVA', delivery: 'Instant PIN' } },
      { id: 'vp-11000', title: '11,000 Valorant Points Pack', category: 'vp', price: 9499, orig: 11999, badge: 'ULTIMATE', desc: 'Reyna tier master vault collection with maximum savings.', details: { vp: 11000, agent: 'REYNA', delivery: 'VIP Instant Direct' } },
      { id: 'viper', title: '475 VP (Viper Edition)', category: 'vp', price: 499, orig: 599, badge: 'POPULAR', desc: '475 Valorant Points instant top-up pack.', details: { vp: 475, agent: 'VIPER' } },
      { id: 'neon', title: '1,000 VP (Neon Edition)', category: 'vp', price: 999, orig: 1199, badge: 'HOT', desc: '1,000 Valorant Points instant top-up pack.', details: { vp: 1000, agent: 'NEON' } },
      { id: 'reyna', title: '2,050 VP (Reyna Edition)', category: 'vp', price: 1999, orig: 2399, badge: 'POPULAR', desc: '2,050 Valorant Points instant top-up pack.', details: { vp: 2050, agent: 'REYNA' } },
      { id: 'fade', title: '3,650 VP (Fade Edition)', category: 'vp', price: 3499, orig: 4199, badge: 'BEST VALUE', desc: '3,650 Valorant Points instant top-up pack.', details: { vp: 3650, agent: 'FADE' } },
      { id: 'jett', title: '5,350 VP (Jett Edition)', category: 'vp', price: 4999, orig: 5999, badge: 'EPIC', desc: '5,350 Valorant Points instant top-up pack.', details: { vp: 5350, agent: 'JETT' } },
      { id: 'iso', title: '11,000 VP (Iso Edition)', category: 'vp', price: 9499, orig: 11999, badge: 'ULTIMATE', desc: '11,000 Valorant Points instant top-up pack.', details: { vp: 11000, agent: 'ISO' } },
      { id: 'coaching-radiant-duo', title: 'Radiant Masterclass & Live Match Review', category: 'coaching', price: 1499, orig: 1999, badge: 'VERIFIED', desc: '1-on-1 private coaching session with tier-1 Radiant analyst, vod review, aim training schedule, and position playbook.', details: { durationHours: 2, coach: 'RadiantCoach#VIB', discordSession: true } },
      { id: 'rankup-plat-to-dia', title: 'Platinum to Diamond Rankup Journey', category: 'rankup', price: 2999, orig: 3999, badge: 'FAST', desc: 'Professional duo queue assistance from Platinum to Diamond with guaranteed win rate and middleman safety.', details: { guaranteed: true, duoMode: true, streamAvailable: true } }
    ];

    for (const p of products) {
      insertProduct.run(p.id, p.title, p.category, p.price, p.orig, p.badge, p.desc, JSON.stringify(p.details), -1, now);
    }
  }

  // Region-specific packs have distinct prices and must not share the generic
  // VP IDs, otherwise the storefront's displayed PHP/INR quote can be spoofed
  // or rejected against the wrong regional price.
  const regionalVpPacks = [
    { id: 'vp-in-475', vp: 475, price: 499 },
    { id: 'vp-in-1000', vp: 1000, price: 999 },
    { id: 'vp-in-2050', vp: 2050, price: 1899 },
    { id: 'vp-in-3650', vp: 3650, price: 3199 },
    { id: 'vp-in-5350', vp: 5350, price: 4499 },
    { id: 'vp-in-7400', vp: 7400, price: 6199 },
    { id: 'vp-in-11000', vp: 11000, price: 8999 },
    { id: 'vp-in-14650', vp: 14650, price: 11999 },
    { id: 'vp-in-22000', vp: 22000, price: 17999 },
    { id: 'vp-in-44000', vp: 44000, price: 34999 },
    { id: 'vp-in-66000', vp: 66000, price: 49999 },
    { id: 'vp-in-110000', vp: 110000, price: 79999 },
    { id: 'vp-in-220000', vp: 220000, price: 149999 },
    { id: 'vp-ph-475', vp: 475, price: 299 },
    { id: 'vp-ph-1000', vp: 1000, price: 549 },
    { id: 'vp-ph-1475', vp: 1475, price: 799 },
    { id: 'vp-ph-2050', vp: 2050, price: 1099 },
    { id: 'vp-ph-2525', vp: 2525, price: 1349 },
    { id: 'vp-ph-3050', vp: 3050, price: 1599 },
    { id: 'vp-ph-3650', vp: 3650, price: 1999 },
  ];
  const insertRegionalVpPack = db.prepare(`
    INSERT OR IGNORE INTO products (id, title, category, price_inr, original_price_inr, badge, description, details_json, stock, active, created_at)
    VALUES (?, ?, 'vp', ?, NULL, NULL, ?, ?, -1, 1, ?)
  `);
  for (const pack of regionalVpPacks) {
    const region = pack.id.startsWith('vp-in-') ? 'Indian' : 'Philippines';
    insertRegionalVpPack.run(
      pack.id,
      `${pack.vp.toLocaleString('en-IN')} VP (${region} Region Top-Up)`,
      pack.price,
      `${pack.vp.toLocaleString('en-IN')} Valorant Points for the ${region} region.`,
      JSON.stringify({ vp: pack.vp, region }),
      now
    );
  }

  // Persist the fixed price points shown by customer service cards. Keeping
  // these in the same catalog lets checkout ignore browser supplied prices.
  const fixedServices = [
    { id: 'service-profile-advertisement', title: 'VIB Profile Advertisement Plan', price: 1499 },
    { id: 'service-region-migration', title: 'Region Change: IND to PHP Migration', price: 1299 },
    { id: 'service-region-conversion', title: 'Region Conversion Support', price: 999 },
    { id: 'service-region-conversion-ind-php', title: 'Region Conversion Support: IND to PHP', price: 1299 },
    { id: 'service-trading-escrow', title: 'Trading & Escrow Facilitation', price: 499 },
    { id: 'service-fresh-ph-profile', title: 'Fresh Philippines (PHP) Profile Provisioning', price: 499 },
    { id: 'service-derank-consult', title: 'Valorant Derank Service Consultation', price: 499 },
    { id: 'service-promotion-plan', title: 'Digital Profile Promotion Plan', price: 1499 },
    { id: 'service-coaching-single', title: 'Coaching: Single 1-Hour Session', price: 799 },
    { id: 'service-coaching-bootcamp', title: 'Coaching: 5-Session Mastery Bootcamp', price: 3499 },
    { id: 'service-coaching-duo', title: 'Coaching: Duo Coaching Package', price: 1499 },
    { id: 'service-coaching-legacy-single', title: 'Valorant 1-on-1 Coaching (Single 1-Hour Session)', price: 799 },
    { id: 'service-coaching-legacy-bootcamp', title: 'Valorant 5-Session Mastery Bootcamp', price: 3499 },
  ];
  const insertFixedService = db.prepare(`
    INSERT OR IGNORE INTO products (id, title, category, price_inr, original_price_inr, badge, description, details_json, stock, active, created_at)
    VALUES (?, ?, 'service', ?, NULL, NULL, 'Fixed price service available through customer checkout.', '{}', -1, 1, ?)
  `);
  for (const service of fixedServices) {
    insertFixedService.run(service.id, service.title, service.price, now);
  }

  // Persist each rank transition rate so rank-up checkout can be recalculated
  // from the server catalog rather than trusting a browser quote.
  const insertRankRate = db.prepare(`
    INSERT OR IGNORE INTO products (id, title, category, price_inr, original_price_inr, badge, description, details_json, stock, active, created_at)
    VALUES (?, ?, 'rank_rate', ?, NULL, NULL, ?, ?, -1, 1, ?)
  `);
  for (const tier of VALORANT_RANKS.slice(0, -1)) {
    insertRankRate.run(
      `rankrate_${tier.id}`,
      `Rank progression rate: ${tier.name} to next tier`,
      tier.costToNext,
      `Persisted INR rate for the transition starting at ${tier.name}.`,
      JSON.stringify({ rankId: tier.id, tierIndex: tier.tierIndex, stdDeliveryHours: tier.stdDeliveryHours, priorityDeliveryHours: tier.priorityDeliveryHours }),
      now
    );
  }

  // Clean out any legacy placeholder or demonstration rental products
  db.prepare("DELETE FROM products WHERE category = 'rental' AND id LIKE 'service-rent-%'").run();

  // Ensure vp-7400 is always present in products table
  const vp7400Exists = db.prepare('SELECT id FROM products WHERE id = ?').get('vp-7400');
  if (!vp7400Exists) {
    db.prepare(`
      INSERT OR REPLACE INTO products (id, title, category, price_inr, original_price_inr, badge, description, details_json, stock, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      'vp-7400',
      '7,400 Valorant Points Pack',
      'vp',
      6199,
      7199,
      'HOT',
      'Sova tier reconnaissance master pack with instant Riot PIN redemption.',
      JSON.stringify({ vp: 7400, agent: 'SOVA', delivery: 'Instant PIN' }),
      -1,
      now
    );
  }

  // 6. Seed Email Templates if empty
  const tplCount = (db.prepare('SELECT COUNT(*) as count FROM email_templates').get() as any).count;
  if (tplCount === 0) {
    console.log('[Database] Seeding communication email templates...');
    const insertTpl = db.prepare(`
      INSERT INTO email_templates (id, name, subject, category, body, variables_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTpl.run(
      'tpl_welcome',
      'Welcome to VIB Platform',
      'Welcome to VIB Digital Services Platform!',
      'onboarding',
      'Hello {{name}},\n\nWelcome to VIB! Your account has been registered under Riot ID: {{riot_id}}. All digital assets are protected through official escrow middleman security.\n\nBest regards,\nVIB Operations Team',
      JSON.stringify(['name', 'riot_id']),
      now,
      now
    );

    insertTpl.run(
      'tpl_order_confirmed',
      'Order Confirmation & Dispatch Notice',
      'Order Received: {{order_id}}',
      'orders',
      'Hello {{name}},\n\nYour order #{{order_id}} for {{title}} has been received and entered our automated dispatch queue. Payment method: {{payment_method}}.\n\nTrack your live order status in your VIB Dashboard.',
      JSON.stringify(['name', 'order_id', 'title', 'payment_method']),
      now,
      now
    );

    insertTpl.run(
      'tpl_kyc_approved',
      'Seller Verification Approved',
      'Verification Complete: Verified Seller',
      'verification',
      'Hello {{name}},\n\nCongratulations! Your seller verification has been reviewed and approved by compliance staff. Your listings are now eligible for instant dispatch.',
      JSON.stringify(['name']),
      now,
      now
    );

    insertTpl.run(
      'tpl_maintenance',
      'Scheduled Maintenance Notification',
      'Scheduled System Maintenance Notice',
      'system',
      'Hello {{name}},\n\nOur platform will undergo scheduled regional payment gateway maintenance from 02:00 AM to 04:00 AM IST. Orders placed during this period will be queued automatically.',
      JSON.stringify(['name']),
      now,
      now
    );
  }

  // 7. Seed Payment Settings if empty
  const paymentSettingCount = (db.prepare('SELECT COUNT(*) as count FROM payment_settings').get() as any).count;
  if (paymentSettingCount === 0) {
    console.log('[Database] Seeding manual QR payment settings...');
    db.prepare(`
      INSERT INTO payment_settings (
        id, upi_id, payee_name, qr_image_url, instructions, currency,
        support_whatsapp, support_email, manual_payment_enabled, verification_instructions, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      'default',
      'thevibofficial@okhdfcbank',
      'VIB Digital Services Platform',
      '/assets/reference_parts/part_01.png',
      'Please scan the official VIB UPI QR code or transfer to UPI ID: thevibofficial@okhdfcbank using any UPI app (GPay, PhonePe, Paytm, BHIM). Enter the exact bill amount and submit your 12-digit Bank Reference / UTR Number with screenshot proof for rapid verification.',
      'INR',
      '+919181801766',
      'thevibofficial@gmail.com',
      'Payment verification typically completes within 5 to 15 minutes. Once verified by our financial staff, your VP code or profile credentials will be issued immediately.',
      now
    );
  }

  // 8. Seed VIP / Promotional Listing Plans if empty
  const vipCount = (db.prepare('SELECT COUNT(*) as count FROM vip_plans').get() as any).count;
  if (vipCount === 0) {
    console.log('[Database] Seeding VIP promotion plans...');
    const insertVip = db.prepare(`
      INSERT INTO vip_plans (id, name, duration_days, price_inr, badge_label, features_json, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    insertVip.run(
      'plan_silver',
      'Silver Feature Plan',
      7,
      499,
      'VIP SILVER',
      JSON.stringify(['Featured placement on Marketplace for 7 days', 'Silver verified badge', 'Standard middleman escrow priority'])
    );
    insertVip.run(
      'plan_gold',
      'Gold High-Impact Plan',
      14,
      899,
      'VIP GOLD',
      JSON.stringify(['Top search results position for 14 days', 'Golden border highlight', 'Priority middleman dispatch', 'Verified seller badge'])
    );
    insertVip.run(
      'plan_platinum',
      'Spotlight Pro Masterplan',
      30,
      1499,
      'SPOTLIGHT PRO',
      JSON.stringify(['Homepage spotlight carousel for 30 days', 'Instant broadcast to VIB Discord community', 'Zero seller transaction fees', 'Dedicated escrow manager'])
    );
  }

  // Never seed redeemable VP PINs. Inventory must be supplier-provided through
  // the authenticated vault import flow; fake placeholders could be delivered
  // to customers as if they were real codes.

  // 10. Seed Authentic Valorant Skin Catalog with Official Riot Assets
  console.log('[Database] Checking & Updating Valorant skin catalog with official Riot API assets...');
  const insertOrUpdateSkin = db.prepare(`
    INSERT INTO skins (id, name, weapon, collection, tier, image_url, video_url, variants_json, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(id) DO UPDATE SET
      image_url = excluded.image_url,
      video_url = excluded.video_url,
      variants_json = excluded.variants_json
  `);

  const skinsList = [
    {
      id: 'sk_kuronami_vandal',
      name: 'Kuronami Vandal',
      weapon: 'Vandal',
      collection: 'Kuronami',
      tier: 'Exclusive',
      image: 'https://media.valorant-api.com/weaponskins/d8d5d7a1-4d81-8560-54bc-0692ab40f69b/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/f31888a6-470e-5d91-eff2-5ba6cd4ea087_default_universal.mp4',
      variants: ['Default (Black/Cyan)', 'Purple', 'White', 'Black']
    },
    {
      id: 'sk_reaver_vandal',
      name: 'Reaver Vandal',
      weapon: 'Vandal',
      collection: 'Reaver',
      tier: 'Premium',
      image: 'https://media.valorant-api.com/weaponskins/30388628-42f0-606c-82c0-73ad43de997f/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/d262fccc-465a-2da6-74ac-049ef3b3f759_default_universal.mp4',
      variants: ['Default (Purple)', 'Red', 'Black', 'White']
    },
    {
      id: 'sk_prime_vandal',
      name: 'Prime Vandal',
      weapon: 'Vandal',
      collection: 'Prime',
      tier: 'Premium',
      image: 'https://media.valorant-api.com/weaponskins/b9ee2457-481c-6776-3f5b-0ca8e8f90c89/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/97f7aa62-ede2-4e34-b5f8-efa798be6e86_default_universal.mp4',
      variants: ['Default (Gold/White)', 'Orange', 'Blue', 'Yellow']
    },
    {
      id: 'sk_rgx_vandal',
      name: 'RGX 11z Pro Vandal',
      weapon: 'Vandal',
      collection: 'RGX 11z Pro',
      tier: 'Exclusive',
      image: 'https://media.valorant-api.com/weaponskins/60b64d4c-4735-a6e5-eb65-4f81512dbb8b/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/fcfafe72-4d0a-6668-cb07-169f44fa738f_default_universal.mp4',
      variants: ['Green LED', 'Red LED', 'Blue LED', 'Yellow LED']
    },
    {
      id: 'sk_araxys_vandal',
      name: 'Araxys Vandal',
      weapon: 'Vandal',
      collection: 'Araxys',
      tier: 'Exclusive',
      image: 'https://media.valorant-api.com/weaponskins/4c926aa9-4f26-bc80-c486-9b888333373f/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/fd6d375d-49a9-4b51-9f2a-ef8a30585b54_default_universal.mp4',
      variants: ['Default', 'Purple', 'Black', 'Silver']
    },
    {
      id: 'sk_prime_phantom',
      name: 'Prime 2.0 Phantom',
      weapon: 'Phantom',
      collection: 'Prime',
      tier: 'Premium',
      image: 'https://media.valorant-api.com/weaponskins/dbff6420-4357-36e2-fc06-53a57e3f8a00/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/cdbb49ff-410a-37e4-23be-91bc7f893e49_default_universal.mp4',
      variants: ['Default', 'Gold', 'Green', 'Cyan']
    },
    {
      id: 'sk_oni_phantom',
      name: 'Oni Phantom',
      weapon: 'Phantom',
      collection: 'Oni',
      tier: 'Premium',
      image: 'https://media.valorant-api.com/weaponskins/36791b03-452d-8dad-0091-898cc28d2196/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/23694a4e-4f34-1ba5-d649-dc9a09880d18_default_universal.mp4',
      variants: ['Default (Red)', 'Black/Gold', 'Green', 'White']
    },
    {
      id: 'sk_recon_phantom',
      name: 'Recon Phantom',
      weapon: 'Phantom',
      collection: 'Recon',
      tier: 'Premium',
      image: 'https://media.valorant-api.com/weaponskins/75949175-4007-aa31-158a-f5bb736ce156/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/6c85779c-497d-66e8-2321-7fa8814777c5_default_universal.mp4',
      variants: ['Military Camo', 'Desert', 'Naval', 'Red Camo']
    },
    {
      id: 'sk_singularity_phantom',
      name: 'Singularity Phantom',
      weapon: 'Phantom',
      collection: 'Singularity',
      tier: 'Exclusive',
      image: 'https://media.valorant-api.com/weaponskins/5eec4ce6-443d-e9b5-4c5b-2b967d426bd3/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/477a5c0e-4f50-1eac-ea13-ef85fd1b77d1_default_universal.mp4',
      variants: ['Default (Dark Purple)', 'Blue', 'Red', 'Gold']
    },
    {
      id: 'sk_araxys_op',
      name: 'Araxys Operator',
      weapon: 'Operator',
      collection: 'Araxys',
      tier: 'Exclusive',
      image: 'https://media.valorant-api.com/weaponskins/f4a0c841-477b-6893-6b3a-8b8a5369680d/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/d5ba7310-410e-a61d-6161-0aa02525167f_default_universal.mp4',
      variants: ['Default', 'Purple', 'Black', 'Silver']
    },
    {
      id: 'sk_kuronami_knife',
      name: 'Kuronami No Yaiba',
      weapon: 'Melee',
      collection: 'Kuronami',
      tier: 'Ultra',
      image: 'https://media.valorant-api.com/weaponskins/ec5cae00-47b2-039c-722a-f1bc6dc2d8a2/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/40a0c4f8-4339-bb76-261d-389f53e6b7fc_default_universal.mp4',
      variants: ['Default (Chained Kunai)', 'Purple', 'White', 'Black']
    },
    {
      id: 'sk_reaver_karambit',
      name: 'Reaver Karambit',
      weapon: 'Melee',
      collection: 'Reaver',
      tier: 'Ultra',
      image: 'https://media.valorant-api.com/weaponskins/5fa8669c-4ec7-b8db-dc53-c98dbfa83313/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/40a0c4f8-4339-bb76-261d-389f53e6b7fc_default_universal.mp4',
      variants: ['Default (Dark Violet)', 'Crimson', 'Onyx', 'White']
    },
    {
      id: 'sk_xenohunter_knife',
      name: 'Xenohunter Knife',
      weapon: 'Melee',
      collection: 'Xenohunter',
      tier: 'Premium',
      image: 'https://media.valorant-api.com/weaponskins/c3295966-4191-c91d-0453-298fefdb1ffb/displayicon.png',
      video: null,
      variants: ['Tactical Finish']
    },
    {
      id: 'sk_sovereign_ghost',
      name: 'Sovereign Ghost',
      weapon: 'Ghost',
      collection: 'Sovereign',
      tier: 'Premium',
      image: 'https://media.valorant-api.com/weaponskins/18ea862e-4b67-d648-5c1a-ee835b866c1f/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/0cf74ecf-4bf1-6d75-5381-eeb7a5e88439_default_universal.mp4',
      variants: ['Gold/White', 'Silver', 'Purple', 'Black']
    },
    {
      id: 'sk_neo_frontier_sheriff',
      name: 'Neo Frontier Sheriff',
      weapon: 'Sheriff',
      collection: 'Neo Frontier',
      tier: 'Exclusive',
      image: 'https://media.valorant-api.com/weaponskins/875080e2-45e3-a602-5c02-e88383e74b5c/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/e758dae2-41ba-73f1-28fe-bfaf64205562_default_universal.mp4',
      variants: ['Old West (Wood)', 'Gold', 'Silver', 'Copper']
    },
    {
      id: 'sk_glitchpop_dagger',
      name: 'Glitchpop Dagger',
      weapon: 'Melee',
      collection: 'Glitchpop',
      tier: 'Exclusive',
      image: 'https://media.valorant-api.com/weaponskins/eeadba94-4d6b-5ef6-d4f1-6782ff77ce9d/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/38a0f2b3-4674-8859-9943-7f9cb8f9d0c6_default_universal.mp4',
      variants: ['Cyberpunk Original']
    },
    {
      id: 'sk_champions_2023_vandal',
      name: 'Champions 2023 Vandal',
      weapon: 'Vandal',
      collection: 'Champions',
      tier: 'Ultra',
      image: 'https://media.valorant-api.com/weaponskins/d2f623ea-44a5-be23-3b2a-14ad7a35e7df/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/23fa2d7d-41a4-9e8c-eec4-d698184f47dc_default_universal.mp4',
      variants: ['Gold Glow']
    },
    {
      id: 'sk_magepunk_ghost',
      name: 'Magepunk Ghost',
      weapon: 'Ghost',
      collection: 'Magepunk',
      tier: 'Premium',
      image: 'https://media.valorant-api.com/weaponskins/33824a13-453b-0636-4ec4-e19708aa934e/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/be0160a8-40c2-4542-e47c-ee9e7461a59c_default_universal.mp4',
      variants: ['Default (Blue Arc)', 'Green', 'Purple', 'Orange']
    }
  ];

  for (const s of skinsList) {
    insertOrUpdateSkin.run(s.id, s.name, s.weapon, s.collection, s.tier, s.image, s.video, JSON.stringify(s.variants), now);
  }

  // 11. Mock listings and auction lots removed. Only VP packages and genuine user data retained.

  // The profile count is a cached aggregate. Repair it from persisted orders so
  // legacy/demo counts never appear as customer order history in CRM or dashboards.
  db.prepare(`
    UPDATE profiles
    SET total_orders = (
      SELECT COUNT(*) FROM orders WHERE orders.user_id = profiles.user_id
    )
  `).run();
}

/**
 * Sync Official Valorant Skins from official API
 * Upserts custom skins, sets lightweight official images and streamed videos
 */
export async function syncOfficialValorantSkins(): Promise<number> {
  try {
    const res = await fetch('https://valorant-api.com/v1/weapons/skins');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.data || !Array.isArray(json.data)) return 0;

    const weaponsList = [
      'Vandal', 'Phantom', 'Operator', 'Sheriff', 'Ghost', 'Spectre',
      'Odin', 'Ares', 'Judge', 'Bucky', 'Frenzy', 'Classic',
      'Shorty', 'Stinger', 'Bulldog', 'Guardian', 'Marshal', 'Outlaw'
    ];

    function getWeapon(displayName: string, assetPath?: string): string {
      for (const w of weaponsList) {
        if (displayName.includes(w)) return w;
      }
      if (assetPath && assetPath.includes('Equippables/Melee')) return 'Melee';
      if (/Karambit|Blade|Dagger|Sword|Axe|Kunai|Katana|Bat|Hammer|Wand|Gauntlet|Fan|Knife|Claw|Scythe|Cane|Relic|Yaiba/i.test(displayName)) {
        return 'Melee';
      }
      return 'Weapon';
    }

    function getCollection(displayName: string, weapon: string): string {
      let col = displayName;
      if (weapon !== 'Weapon' && col.includes(weapon)) {
        col = col.replace(weapon, '').trim();
      }
      return col || 'Standard';
    }

    const insertOrReplace = db.prepare(`
      INSERT OR REPLACE INTO skins (id, name, weapon, collection, tier, image_url, video_url, variants_json, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const now = new Date().toISOString();
    let count = 0;

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const s of (json.data || [])) {
        if (!s.displayName || s.displayName.startsWith('Standard') || s.displayName.startsWith('Random') || !s.displayIcon) {
          continue;
        }

        const weapon = getWeapon(s.displayName, s.assetPath);
        const collection = getCollection(s.displayName, weapon);
        const video = (s.levels && Array.isArray(s.levels))
          ? (s.levels.filter((l: any) => l.streamedVideo).pop()?.streamedVideo || null)
          : null;

        const variants = (s.chromas && Array.isArray(s.chromas))
          ? s.chromas.map((c: any) => ({
              name: c.displayName,
              icon: c.displayIcon || c.fullRender || null,
              video: c.streamedVideo || null
            }))
          : [];

        insertOrReplace.run(
          s.uuid,
          s.displayName,
          weapon,
          collection,
          s.contentTierUuid ? 'Premium' : 'Standard',
          s.displayIcon,
          video,
          JSON.stringify(variants),
          now
        );
        count++;
      }
      db.exec('COMMIT;');
    } catch (txErr) {
      try { db.exec('ROLLBACK;'); } catch {}
      throw txErr;
    }
    console.log(`[Database] Synced ${count} official Valorant skins with real API images and upgrade clips.`);
    return count;
  } catch (err: any) {
    console.warn('[Database] Could not sync skins from valorant-api.com:', err.message);
    return 0;
  }
}
