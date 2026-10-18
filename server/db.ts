import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel ? '/tmp/data' : path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'vib.db');
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
`);

// Safe column migrations
try {
  db.exec('ALTER TABLE users ADD COLUMN firebase_uid TEXT');
} catch {}
try {
  db.exec("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'");
} catch {}
try {
  db.exec('ALTER TABLE users ADD COLUMN riot_verified INTEGER DEFAULT 0');
} catch {}

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

export function generateToken(): string {
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

    // 2. Staff / Moderator
    const modPass = hashPassword('Moderator@123');
    const modId = 'usr_mod_02';
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, phone, riot_id, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      modId,
      'moderator@vib.gg',
      modPass.hash,
      modPass.salt,
      'VIB Escrow & Dispatch Staff',
      '+91 91818 01767',
      'VIB_Officer#9999',
      'moderator',
      'active',
      1,
      now,
      now
    );

    db.prepare(`
      INSERT INTO profiles (user_id, bio, avatar, discord_tag, wallet_balance, kyc_status, total_orders, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      modId,
      'Escrow Officer & Customer Care Lead.',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      'VIB_Escrow#7777',
      5000.0,
      'verified',
      42,
      now
    );

    // 3. Verified Seller
    const sellerPass = hashPassword('SellerPassword@123');
    const sellerId = 'usr_seller_03';
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, phone, riot_id, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sellerId,
      'seller@vib.gg',
      sellerPass.hash,
      sellerPass.salt,
      'Radiant Market Seller',
      '+91 98765 43210',
      'RadiantSeller#PRO',
      'seller',
      'active',
      1,
      now,
      now
    );

    db.prepare(`
      INSERT INTO profiles (user_id, bio, avatar, discord_tag, wallet_balance, kyc_status, total_orders, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sellerId,
      'Top rated digital profile provider and high-tier account collector.',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      'RadiantSeller#1337',
      18450.0,
      'verified',
      315,
      now
    );

    // 4. Standard User / Buyer
    const userPass = hashPassword('CustomerPassword@123');
    const userId = 'usr_customer_04';
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, phone, riot_id, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      'customer@vib.gg',
      userPass.hash,
      userPass.salt,
      'Alex Mercer',
      '+91 91234 56789',
      'AlexMercer#VAL',
      'user',
      'active',
      1,
      now,
      now
    );

    db.prepare(`
      INSERT INTO profiles (user_id, bio, avatar, discord_tag, wallet_balance, kyc_status, total_orders, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      'Ascendant 2 player, aiming for Immortal rank this season.',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      'AlexM#1234',
      1200.0,
      'verified',
      3,
      now
    );

    // Seed Initial Orders for customer
    const order1Id = 'ord_1001';
    db.prepare(`
      INSERT INTO orders (id, user_id, type, title, amount, currency, status, payment_method, details_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order1Id,
      userId,
      'vp',
      '5,350 VP Indian Region Pack',
      4499,
      'INR',
      'completed',
      'UPI / PhonePe',
      JSON.stringify({ riotId: 'AlexMercer#VAL', deliveryTime: 'Instant (14 mins)' }),
      new Date(Date.now() - 86400000 * 2).toISOString(),
      new Date(Date.now() - 86400000 * 2).toISOString()
    );

    db.prepare(`
      INSERT INTO transactions (id, user_id, order_id, type, amount, currency, status, reference_no, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'txn_1001',
      userId,
      order1Id,
      'payment',
      4499,
      'INR',
      'success',
      'VIB-UPI-20261013-0941',
      new Date(Date.now() - 86400000 * 2).toISOString()
    );

    const order2Id = 'ord_1002';
    db.prepare(`
      INSERT INTO orders (id, user_id, type, title, amount, currency, status, payment_method, details_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order2Id,
      userId,
      'rankup',
      'Platinum 2 to Diamond 1 Journey Assistance',
      2999,
      'INR',
      'processing',
      'Razorpay Netbanking',
      JSON.stringify({ currentRank: 'Platinum 2', targetRank: 'Diamond 1', booster: 'RadiantAgent#01' }),
      new Date(Date.now() - 86400000 * 0.5).toISOString(),
      now
    );

    db.prepare(`
      INSERT INTO transactions (id, user_id, order_id, type, amount, currency, status, reference_no, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'txn_1002',
      userId,
      order2Id,
      'payment',
      2999,
      'INR',
      'success',
      'VIB-RZP-20261015-1822',
      new Date(Date.now() - 86400000 * 0.5).toISOString()
    );

    // Initial Support Ticket
    db.prepare(`
      INSERT INTO support_tickets (id, user_id, subject, category, status, priority, messages_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'tkt_2001',
      userId,
      'Request for duo queue schedule coordination',
      'orders',
      'open',
      'medium',
      JSON.stringify([
        { sender: 'user', senderName: 'Alex Mercer', text: 'Hi team, what time will the radiant coach connect with me for the first duo session?', time: now }
      ]),
      now,
      now
    );

    // Initial Notifications
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'notif_3001',
      userId,
      'Order Confirmed: 5,350 VP Top-Up',
      'Your Indian VP order has been successfully credited directly to Riot ID AlexMercer#VAL.',
      'order',
      1,
      new Date(Date.now() - 86400000 * 2).toISOString()
    );

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'notif_3002',
      userId,
      'Journey Order In Progress',
      'Your Platinum 2 to Diamond 1 journey assistance order #ord_1002 is active. You can chat with your team anytime.',
      'info',
      0,
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
      { id: 'vp-11000', title: '11,000 Valorant Points Pack', category: 'vp', price: 9499, orig: 11999, badge: 'ULTIMATE', desc: 'Reyna tier master vault collection with maximum savings.', details: { vp: 11000, agent: 'REYNA', delivery: 'VIP Instant Direct' } },
      { id: 'profile-kuronami-immortal', title: 'Immortal 1 Kuronami Vandal Account', category: 'profile', price: 4999, orig: 6999, badge: 'FEATURED', desc: 'Level 210 prime verified account with 210+ skins including Kuronami Vandal, Reaver Vandal, Prime Phantom, Glitchpop Dagger.', details: { rank: 'Immortal 1', level: 210, skins: ['Kuronami Vandal', 'Reaver Vandal', 'Prime Phantom', 'Glitchpop Dagger'], region: 'AP / Mumbai', fullAccess: true } },
      { id: 'profile-radiant-singularity', title: 'Radiant Singularity & Champions Vault', category: 'profile', price: 12499, orig: 16999, badge: 'HOT', desc: 'Level 350 full access account with Singularity Phantom, Champions 2023 Vandal, Araxys Operator, Ignite Fan.', details: { rank: 'Radiant', level: 350, skins: ['Singularity Phantom', 'Champions 2023 Vandal', 'Araxys Operator', 'Ignite Fan'], region: 'AP / Mumbai', fullAccess: true } },
      { id: 'profile-ascendant-prime', title: 'Ascendant 3 Prime & Araxys Collection', category: 'profile', price: 3999, orig: 5999, badge: 'POPULAR', desc: 'Level 120 prime account with Prime Vandal, Araxys Vandal, Magepunk Ghost, Oni Phantom.', details: { rank: 'Ascendant 3', level: 120, skins: ['Prime Vandal', 'Araxys Vandal', 'Magepunk Ghost', 'Oni Phantom'], region: 'AP / Mumbai', fullAccess: true } },
      { id: 'p-immortal-310', title: 'Immortal Profile (Level 310)', category: 'profile', price: 24999, orig: 32999, badge: 'LIFETIME GUARANTEED', desc: 'Level 310 Immortal account with 20+ premium skins and full lifetime guarantee.', details: { rank: 'Immortal', level: 310, skins: ['Prime Vandal', 'RGX Vandal', 'Reaver Vandal'] } },
      { id: 'p-ascendant-205', title: 'Ascendant Profile (Level 205)', category: 'profile', price: 14999, orig: 19999, badge: 'LIFETIME GUARANTEED', desc: 'Level 205 Ascendant account with Prime Collection.', details: { rank: 'Ascendant', level: 205, skins: ['Prime Vandal', 'RGX Phantom', 'RGX Vandal'] } },
      { id: 'p-radiant-420', title: 'Radiant Profile (Level 420)', category: 'profile', price: 59999, orig: 89999, badge: 'LIFETIME GUARANTEED', desc: 'Level 420 Radiant account with full access and elite skins.', details: { rank: 'Radiant', level: 420, skins: ['Prime Vandal', 'Reaver Vandal', 'RGX Phantom'] } },
      { id: 'p-diamond-180', title: 'Diamond Profile (Level 180)', category: 'profile', price: 8999, orig: 14999, badge: 'LIFETIME GUARANTEED', desc: 'Level 180 Diamond account with multiple skins.', details: { rank: 'Diamond', level: 180, skins: ['Prime Vandal', 'RGX Phantom', 'RGX Vandal'] } },
      { id: 'p-ascendant-250', title: 'Ascendant Profile (Level 250)', category: 'profile', price: 16999, orig: 24999, badge: 'LIFETIME GUARANTEED', desc: 'Level 250 Ascendant account with rare skins.', details: { rank: 'Ascendant', level: 250, skins: ['Prime Vandal', 'RGX Vandal', 'RGX Phantom'] } },
      { id: 'pub-plat-145', title: 'Platinum 3 Profile (Level 145)', category: 'profile', price: 6499, orig: 8999, badge: 'PUBLIC LISTING', desc: 'Level 145 Platinum account with Glitchpop & Prime.', details: { rank: 'Platinum', level: 145, skins: ['Prime Vandal', 'RGX Phantom', 'RGX Vandal'] } },
      { id: 'viper', title: '475 VP (Viper Edition)', category: 'vp', price: 499, orig: 599, badge: 'POPULAR', desc: '475 Valorant Points instant top-up pack.', details: { vp: 475, agent: 'VIPER' } },
      { id: 'neon', title: '1,000 VP (Neon Edition)', category: 'vp', price: 999, orig: 1199, badge: 'HOT', desc: '1,000 Valorant Points instant top-up pack.', details: { vp: 1000, agent: 'NEON' } },
      { id: 'reyna', title: '2,050 VP (Reyna Edition)', category: 'vp', price: 1999, orig: 2399, badge: 'POPULAR', desc: '2,050 Valorant Points instant top-up pack.', details: { vp: 2050, agent: 'REYNA' } },
      { id: 'fade', title: '3,650 VP (Fade Edition)', category: 'vp', price: 3499, orig: 4199, badge: 'BEST VALUE', desc: '3,650 Valorant Points instant top-up pack.', details: { vp: 3650, agent: 'FADE' } },
      { id: 'jett', title: '5,350 VP (Jett Edition)', category: 'vp', price: 4999, orig: 5999, badge: 'EPIC', desc: '5,350 Valorant Points instant top-up pack.', details: { vp: 5350, agent: 'JETT' } },
      { id: 'iso', title: '11,000 VP (Iso Edition)', category: 'vp', price: 9499, orig: 11999, badge: 'ULTIMATE', desc: '11,000 Valorant Points instant top-up pack.', details: { vp: 11000, agent: 'ISO' } },
      { id: 'coaching-radiant-duo', title: 'Radiant Masterclass & Live Match Review', category: 'coaching', price: 1499, orig: 1999, badge: 'VERIFIED', desc: '1-on-1 private coaching session with tier-1 Radiant analyst, vod review, aim training schedule, and position playbook.', details: { durationHours: 2, coach: 'RadiantCoach#VIB', discordSession: true } },
      { id: 'rankup-plat-to-dia', title: 'Platinum to Diamond Rankup Journey', category: 'rankup', price: 2999, orig: 3999, badge: 'FAST', desc: 'Professional duo queue assistance from Platinum to Diamond with guaranteed win rate and middleman safety.', details: { guaranteed: true, duoMode: true, streamAvailable: true } },
      { id: 'rental-radiant-smurf-24h', title: 'Radiant Account 24h Daily Rental', category: 'rental', price: 499, orig: 699, badge: 'INSTANT', desc: '24-hour full access rental to verified Radiant account for scrims, customs, and high-tier competitive games.', details: { durationHours: 24, instantCode: true } }
    ];

    for (const p of products) {
      insertProduct.run(p.id, p.title, p.category, p.price, p.orig, p.badge, p.desc, JSON.stringify(p.details), -1, now);
    }
  }

  // 2. Seed Invoices if empty
  const invoiceCount = (db.prepare('SELECT COUNT(*) as count FROM invoices').get() as any).count;
  if (invoiceCount === 0) {
    console.log('[Database] Seeding initial invoices...');
    db.prepare(`
      INSERT INTO invoices (
        id, order_id, customer_id, customer_name, customer_email, customer_phone,
        billing_address, seller_name, product_name, description, quantity,
        unit_price, subtotal, platform_fee, tax_amount, discount_amount, final_total,
        currency, status, payment_method, payment_reference, notes, invoice_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'VIB-INV-0001',
      'ord_1001',
      'usr_customer_04',
      'Alex Mercer',
      'customer@vib.gg',
      '+91 91234 56789',
      'Bangalore, Karnataka, India',
      'VIB Official Store',
      '5,350 VP Indian Region Pack',
      'Indian Region Valorant Points Top-Up via Riot direct gateway.',
      1,
      4499.0,
      3812.71,
      0,
      686.29,
      0,
      4499.0,
      'INR',
      'paid',
      'UPI / PhonePe',
      'VIB-UPI-20261013-0941',
      'Tax invoice generated automatically upon order fulfillment. GST at 18% included.',
      new Date(Date.now() - 86400000 * 2).toISOString(),
      now
    );
  }

  // 3. Seed Operating Expenses if empty
  const expenseCount = (db.prepare('SELECT COUNT(*) as count FROM expenses').get() as any).count;
  if (expenseCount === 0) {
    console.log('[Database] Seeding initial operating expenses...');
    const insertExp = db.prepare(`
      INSERT INTO expenses (id, category, description, amount, currency, payment_method, reference_no, recorded_by, expense_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertExp.run(
      'exp_001',
      'server_hosting',
      'Singapore Edge Cloud Servers & Low-Latency Relay Nodes',
      8450.0,
      'INR',
      'Corporate Credit Card',
      'AWS-SG-91823',
      'VIB Executive Superadmin',
      new Date(Date.now() - 86400000 * 5).toISOString(),
      now
    );

    insertExp.run(
      'exp_002',
      'payment_gateway_fee',
      'Payment Gateway Settlement Fees & UPI Banking Network Surcharges',
      2340.0,
      'INR',
      'Direct Bank Debit',
      'PG-SETTLE-4481',
      'VIB Executive Superadmin',
      new Date(Date.now() - 86400000 * 3).toISOString(),
      now
    );

    insertExp.run(
      'exp_003',
      'api_cost',
      'Valorant Game API Match Data Feeds & Verification Services',
      3200.0,
      'INR',
      'Bank Transfer',
      'RIOT-DEV-1092',
      'VIB Executive Superadmin',
      new Date(Date.now() - 86400000 * 1).toISOString(),
      now
    );
  }

  // 4. Seed Staff Tasks if empty
  const taskCount = (db.prepare('SELECT COUNT(*) as count FROM staff_tasks').get() as any).count;
  if (taskCount === 0) {
    console.log('[Database] Seeding employee tasks...');
    const insertTask = db.prepare(`
      INSERT INTO staff_tasks (id, title, description, department, priority, status, assigned_to, created_by, due_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTask.run(
      'task_001',
      'Review seller withdrawal request #WTH-8812',
      'Verify bank account IFSC and KYC proof for seller RadiantSeller#PRO prior to fund dispatch.',
      'finance',
      'high',
      'in_progress',
      'usr_mod_02',
      'usr_superadmin_01',
      new Date(Date.now() + 86400000).toISOString(),
      'Seller has zero previous chargebacks. Identity verified.',
      now,
      now
    );

    insertTask.run(
      'task_002',
      'Coordinate coaching session for order #ord_1002',
      'Connect customer Alex Mercer with assigned Radiant coach RadiantAgent#01 on Discord.',
      'support',
      'medium',
      'pending',
      'usr_mod_02',
      'usr_superadmin_01',
      new Date(Date.now() + 86400000 * 2).toISOString(),
      'Customer requested weekend evening slot.',
      now,
      now
    );

    insertTask.run(
      'task_003',
      'Audit newly submitted digital profile listings',
      'Inspect skin inventory screenshots and rank proof for anti-fraud guideline compliance.',
      'moderation',
      'low',
      'completed',
      'usr_mod_02',
      'usr_superadmin_01',
      new Date(Date.now() - 86400000).toISOString(),
      'All 14 pending listings inspected and passed.',
      now,
      now
    );
  }

  // 5. Seed User CRM Notes if empty
  const crmCount = (db.prepare('SELECT COUNT(*) as count FROM user_crm_notes').get() as any).count;
  if (crmCount === 0) {
    console.log('[Database] Seeding initial customer CRM notes...');
    db.prepare(`
      INSERT INTO user_crm_notes (id, user_id, staff_id, staff_name, note, risk_level, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'crm_note_001',
      'usr_customer_04',
      'usr_superadmin_01',
      'VIB Executive Superadmin',
      'High-trust buyer. Fast UPI payer with zero dispute history. Verified Riot ID AlexMercer#VAL.',
      'low',
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

  // 9. Seed VP Code Inventory if empty
  const vpCodesCount = (db.prepare('SELECT COUNT(*) as count FROM vp_codes').get() as any).count;
  if (vpCodesCount === 0) {
    console.log('[Database] Seeding initial genuine VP code inventory...');
    const insertCode = db.prepare(`
      INSERT INTO vp_codes (id, package_id, code, status, batch_no, created_at)
      VALUES (?, ?, ?, 'available', ?, ?)
    `);

    const initialCodes = [
      { pkg: 'vp-475', code: 'VIB-VP475-7X9K2M4P' },
      { pkg: 'vp-475', code: 'VIB-VP475-9A3W5E8R' },
      { pkg: 'vp-475', code: 'VIB-VP475-1B4C7D2F' },
      { pkg: 'vp-1000', code: 'VIB-VP1000-2B5C8D1G' },
      { pkg: 'vp-1000', code: 'VIB-VP1000-9F1H4J7K' },
      { pkg: 'vp-2050', code: 'VIB-VP2050-6K3L8M2N' },
      { pkg: 'vp-2050', code: 'VIB-VP2050-7N2P9Q4R' },
      { pkg: 'vp-3650', code: 'VIB-VP3650-1R4T7V9X' },
      { pkg: 'vp-3650', code: 'VIB-VP3650-8X5Y2Z6A' },
      { pkg: 'vp-5350', code: 'VIB-VP5350-3A6C9E2G' },
      { pkg: 'vp-11000', code: 'VIB-VP11000-5G8J1L4N' },
    ];

    for (let i = 0; i < initialCodes.length; i++) {
      const item = initialCodes[i];
      insertCode.run(`vpc_${i + 1}`, item.pkg, item.code, 'BATCH-2026-10-A', now);
    }
  }

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
      image: 'https://media.valorant-api.com/weaponskins/a14589d8-4f05-0219-c6e7-138383a15234/displayicon.png',
      video: 'https://valorant.dyn.riotcdn.net/x/videos/release-13.08/bb9a8e0f-48d0-e14b-252a-9ca86810a9cf_default_universal.mp4',
      variants: ['Default (Blue Arc)', 'Green', 'Purple', 'Orange']
    }
  ];

  for (const s of skinsList) {
    insertOrUpdateSkin.run(s.id, s.name, s.weapon, s.collection, s.tier, s.image, s.video, JSON.stringify(s.variants), now);
  }

  // 11. Seed Real Community & VIB-Managed Listings if empty
  // 11. Seed Real Community & VIB-Managed Listings
  const insertListing = db.prepare(`
    INSERT OR IGNORE INTO listings (
      id, user_id, seller_name, seller_role, guarantee_type, title, description,
      price_inr, rank, peak_rank, level, region, skin_count, knife_count, featured,
      vip_plan, vip_expires_at, images_json, skins_json, status, rejection_reason, inquiry_contact, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', NULL, ?, ?, ?)
  `);

    insertListing.run(
      'lst_immortal_kuronami',
      'usr_seller_03',
      'Radiant Market Seller',
      'vib_managed',
      'lifetime_guaranteed',
      'Immortal 1 Kuronami Vandal Account',
      'Level 210 prime verified account with 210+ premium skins including Kuronami Vandal, Reaver Vandal, Prime Phantom, and Glitchpop Dagger. 100% lifetime recovery guarantee by VIB Digital Services.',
      4999,
      'Immortal 1',
      'Immortal 3',
      210,
      'AP / Mumbai',
      42,
      6,
      1,
      'platinum',
      new Date(Date.now() + 86400000 * 28).toISOString(),
      JSON.stringify(['/assets/hires/profiles/card1_omen.jpg']),
      JSON.stringify(['Kuronami Vandal', 'Reaver Vandal', 'Prime Phantom', 'Glitchpop Dagger']),
      'thevibofficial@gmail.com',
      now,
      now
    );

    insertListing.run(
      'lst_radiant_singularity',
      'usr_seller_03',
      'Radiant Market Seller',
      'vib_managed',
      'lifetime_guaranteed',
      'Radiant Singularity & Champions Vault',
      'High-tier full access profile with Singularity Phantom, Champions 2023 Vandal, Araxys Operator, and Ignite Fan. Zero bans, active MMR, Mumbai and Singapore low-ping servers.',
      12499,
      'Radiant',
      'Radiant',
      350,
      'AP / Mumbai',
      88,
      12,
      1,
      'gold',
      new Date(Date.now() + 86400000 * 12).toISOString(),
      JSON.stringify(['/assets/hires/profiles/card3_phoenix.jpg']),
      JSON.stringify(['Singularity Phantom', 'Champions 2023 Vandal', 'Araxys Operator', 'Ignite Fan']),
      'thevibofficial@gmail.com',
      now,
      now
    );

    insertListing.run(
      'lst_ascendant_prime',
      'usr_seller_03',
      'Radiant Market Seller',
      'community',
      'escrow_protected',
      'Ascendant 3 Prime & Araxys Collection',
      'Clean competitive account with Prime Vandal, Araxys Vandal, Magepunk Ghost, and Oni Phantom. Verified through VIB Escrow Middleman Desk. Inquiry-based inspection welcome.',
      3999,
      'Ascendant 3',
      'Immortal 1',
      120,
      'AP / Mumbai',
      24,
      3,
      0,
      'none',
      null,
      JSON.stringify(['/assets/hires/profiles/card2_reyna.jpg']),
      JSON.stringify(['Prime Vandal', 'Araxys Vandal', 'Magepunk Ghost', 'Oni Phantom']),
      'thevibofficial@gmail.com',
      now,
      now
    );

    insertListing.run(
      'lst_diamond_daily',
      'usr_customer_04',
      'Alex Mercer',
      'community',
      'escrow_protected',
      'Diamond 2 Clean Battlepass + Reaver Account',
      'Personal account, never shared or smurfed on. Includes Reaver Vandal, Sovereign Sword, and EP 7/8 Battlepasses completed. Fast escrow release.',
      2499,
      'Diamond 2',
      'Diamond 3',
      85,
      'AP / Mumbai',
      14,
      2,
      0,
      'none',
      null,
      JSON.stringify(['/assets/hires/profiles/card4_viper.jpg']),
      JSON.stringify(['Reaver Vandal', 'Sovereign Sword']),
      'thevibofficial@gmail.com',
      now,
      now
    );

    insertListing.run(
      'lst_immortal_310',
      'usr_seller_03',
      'Radiant Market Seller',
      'vib_managed',
      'lifetime_guaranteed',
      'Immortal Profile - Kuronami & Reaver Collection',
      'Level 310 competitive account with 20+ premium skins. 100% lifetime recovery guarantee by VIB Digital Services. Full access with original email credentials.',
      24999,
      'Immortal 2',
      'Immortal 3',
      310,
      'AP / Mumbai',
      45,
      6,
      1,
      'platinum',
      new Date(Date.now() + 86400000 * 30).toISOString(),
      JSON.stringify(['/assets/hires/profiles/card1_exact.jpg']),
      JSON.stringify(['Kuronami Vandal', 'Reaver Vandal', 'Prime 2.0 Phantom', 'Glitchpop Dagger']),
      'thevibofficial@gmail.com',
      now,
      now
    );

    insertListing.run(
      'lst_ascendant_205',
      'usr_seller_03',
      'Radiant Market Seller',
      'vib_managed',
      'lifetime_guaranteed',
      'Ascendant Profile - Prime Collection',
      'Level 205 verified profile featuring Prime Vandal, RGX Phantom, and Araxys Vandal. Verified and covered by VIB Lifetime Guarantee.',
      14999,
      'Ascendant 2',
      'Ascendant 3',
      205,
      'AP / Mumbai',
      32,
      4,
      1,
      'gold',
      new Date(Date.now() + 86400000 * 20).toISOString(),
      JSON.stringify(['/assets/hires/profiles/card2_exact.jpg']),
      JSON.stringify(['Prime Vandal', 'RGX 11z Pro Phantom', 'Araxys Vandal']),
      'thevibofficial@gmail.com',
      now,
      now
    );

    insertListing.run(
      'lst_radiant_420',
      'usr_seller_03',
      'Radiant Market Seller',
      'vib_managed',
      'lifetime_guaranteed',
      'Radiant Profile - Champions Vault & Full Access',
      'Level 420 premier account. Complete Champions 2023 set, Kuronami Vandal, Singularity Phantom, and Ignite Fan. Zero penalties, peak competitive MMR.',
      59999,
      'Radiant',
      'Radiant',
      420,
      'AP / Mumbai',
      110,
      15,
      1,
      'platinum',
      new Date(Date.now() + 86400000 * 30).toISOString(),
      JSON.stringify(['/assets/hires/profiles/card3_exact.jpg']),
      JSON.stringify(['Champions 2023 Vandal', 'Kuronami Vandal', 'Singularity Phantom', 'Ignite Fan']),
      'thevibofficial@gmail.com',
      now,
      now
    );

    insertListing.run(
      'lst_diamond_180',
      'usr_seller_03',
      'Radiant Market Seller',
      'vib_managed',
      'lifetime_guaranteed',
      'Diamond Profile - Multiple High-Tier Skins',
      'Level 180 account with multiple skin bundles including Prime, Reaver, and RGX Blade. Safe transfer with VIB Lifetime Warranty.',
      8999,
      'Diamond 3',
      'Ascendant 1',
      180,
      'AP / Mumbai',
      28,
      3,
      1,
      'silver',
      new Date(Date.now() + 86400000 * 14).toISOString(),
      JSON.stringify(['/assets/hires/profiles/card4_exact.jpg']),
      JSON.stringify(['Prime Vandal', 'Reaver Operator', 'RGX 11z Pro Blade']),
      'thevibofficial@gmail.com',
      now,
      now
    );

    insertListing.run(
      'lst_platinum_145',
      'usr_customer_04',
      'Alex Mercer',
      'community',
      'escrow_protected',
      'Platinum 3 Profile - Glitchpop & Prime',
      'Clean personal account with Glitchpop Vandal and Prime Phantom. Escrow protected with instant middleman coordination.',
      6499,
      'Platinum 3',
      'Diamond 1',
      145,
      'AP / Mumbai',
      19,
      2,
      0,
      'silver',
      new Date(Date.now() + 86400000 * 7).toISOString(),
      JSON.stringify(['/assets/hires/profiles/card5_exact.jpg']),
      JSON.stringify(['Glitchpop Vandal', 'Prime Phantom', 'Ion Operator']),
      'thevibofficial@gmail.com',
      now,
      now
    );

    insertListing.run(
      'lst_gold_90',
      'usr_customer_04',
      'Alex Mercer',
      'community',
      'escrow_protected',
      'Gold 2 Profile - Oni Phantom Collection',
      'Great smurf or main account with Oni Phantom and Xenohunter Knife. Low competitive queue delay and clean MMR.',
      4299,
      'Gold 2',
      'Gold 3',
      90,
      'AP / Mumbai',
      12,
      1,
      0,
      'none',
      null,
      JSON.stringify(['/assets/hires/profiles/card2_exact.jpg']),
      JSON.stringify(['Oni Phantom', 'Prime Vandal', 'Xenohunter Knife']),
      'thevibofficial@gmail.com',
      now,
      now
    );
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
