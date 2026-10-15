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

    console.log('[Database] Seeding completed successfully.');
  }
}
