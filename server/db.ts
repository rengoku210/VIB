import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'vib.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency
db.exec('PRAGMA journal_mode = WAL;');
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
}
