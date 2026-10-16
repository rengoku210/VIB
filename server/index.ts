import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db, hashPassword, verifyPassword, generateToken, seedDatabase } from './db.js';
import { verifyRiotId, seedRiotAccounts } from './riot.js';

// Initialize and seed database
seedDatabase();
seedRiotAccounts();

const app = express();
const PORT = process.env.PORT || 5000;

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req: Request, res: Response): void => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Extend Express Request
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
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
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No bearer token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const now = new Date().toISOString();

  const sessionStmt = db.prepare(`
    SELECT s.token, s.user_id, s.expires_at,
           u.id, u.email, u.name, u.phone, u.riot_id, u.riot_verified, u.role, u.status, u.email_verified,
           p.bio, p.avatar, p.discord_tag, p.wallet_balance, p.kyc_status, p.total_orders
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE s.token = ?
  `);

  const row = sessionStmt.get(token) as any;

  if (!row) {
    res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    return;
  }

  if (row.expires_at < now) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
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
    phone: row.phone,
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

// Helper to log administrative actions
function logAudit(actorId: string, actorName: string, action: string, targetType: string, targetId: string, details: any, ip: string) {
  const auditId = 'aud_' + crypto.randomBytes(8).toString('hex');
  db.prepare(`
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
    ip,
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

// ==========================================
// PUBLIC PRODUCTS & CATALOG ROUTES
// ==========================================

// Get Catalog Products with optional filtering, search, and sorting
app.get('/api/products', (req: Request, res: Response): void => {
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

  const products = db.prepare(query).all(...params).map((p: any) => ({
    ...p,
    details: p.details_json ? JSON.parse(p.details_json) : {}
  }));

  res.json({ products });
});

// Get Single Product by ID
app.get('/api/products/:id', (req: Request, res: Response): void => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
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
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// 1. Register
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone, riot_id } = req.body;

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

    // Check duplicate
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailTrimmed);
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
      isRiotVerified = 1;
    }

    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
    const { hash, salt } = hashPassword(password);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();

    // Default public registrations are 'user' (NEVER admin)
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, phone, riot_id, riot_verified, role, status, email_verified, verification_code, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', 'active', 1, ?, ?, ?)
    `).run(
      userId,
      emailTrimmed,
      hash,
      salt,
      String(name).trim(),
      phone ? String(phone).trim() : null,
      verifiedRiotId,
      isRiotVerified,
      verificationCode,
      now,
      now
    );

    // Profile record
    db.prepare(`
      INSERT INTO profiles (user_id, bio, avatar, discord_tag, wallet_balance, kyc_status, total_orders, created_at)
      VALUES (?, ?, ?, ?, 0.0, 'unverified', 0, ?)
    `).run(
      userId,
      'New VIB Member',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      null,
      now
    );

    // Generate session token (30 days)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, expiresAt, now);

    // Welcome Notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
      VALUES (?, ?, ?, ?, 'info', 0, ?)
    `).run(
      'notif_' + crypto.randomBytes(8).toString('hex'),
      userId,
      'Welcome to VIB Digital Services Platform!',
      'Your account has been created. Enjoy verified Valorant VP top-ups, rank journeys, and protected marketplace transactions.',
      now
    );

    logAudit(userId, name, 'REGISTER_USER', 'user', userId, { email: emailTrimmed }, req.ip || '127.0.0.1');

    res.status(201).json({
      message: 'Registration successful! Welcome to VIB.',
      token,
      user: {
        id: userId,
        email: emailTrimmed,
        name: String(name).trim(),
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
app.post('/api/auth/login', (req: Request, res: Response): void => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    const userRow = db.prepare(`
      SELECT u.id, u.email, u.password_hash, u.salt, u.name, u.phone, u.riot_id, u.role, u.status, u.email_verified,
             p.bio, p.avatar, p.discord_tag, p.wallet_balance, p.kyc_status, p.total_orders
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.email = ?
    `).get(emailTrimmed) as any;

    if (!userRow) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const passwordValid = verifyPassword(password, userRow.password_hash, userRow.salt);
    if (!passwordValid) {
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

    // Generate Session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userRow.id, expiresAt, now);

    logAudit(userRow.id, userRow.name, 'USER_LOGIN', 'session', token, {}, req.ip || '127.0.0.1');

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

// 2b. Firebase Authentication & Google Login Bridge
app.post('/api/auth/firebase-login', (req: Request, res: Response): void => {
  try {
    const { email, name, photoURL, avatar, uid, idToken } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Valid email is required from Firebase authentication.' });
      return;
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    const displayName = String(name || emailTrimmed.split('@')[0]).trim();
    const resolvedAvatar = photoURL || avatar || null;
    const now = new Date().toISOString();

    // Check if user already exists
    let userRow = db.prepare(`
      SELECT u.id, u.email, u.name, u.phone, u.riot_id, u.role, u.status, u.email_verified, u.auth_provider,
             p.bio, p.avatar, p.discord_tag, p.wallet_balance, p.kyc_status, p.total_orders
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
        db.prepare('UPDATE users SET firebase_uid = COALESCE(?, firebase_uid), email_verified = 1, updated_at = ? WHERE id = ?')
          .run(uid || null, now, userId);
      } catch {}

      if (resolvedAvatar) {
        try {
          db.prepare('UPDATE profiles SET avatar = ? WHERE user_id = ?').run(resolvedAvatar, userId);
          userRow.avatar = resolvedAvatar;
        } catch {}
      }
    } else {
      // Provision new user from Google/Firebase
      userId = 'usr_' + crypto.randomBytes(8).toString('hex');
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const { hash, salt } = hashPassword(randomPassword);

      db.prepare(`
        INSERT INTO users (id, email, password_hash, salt, name, role, status, email_verified, firebase_uid, auth_provider, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'user', 'active', 1, ?, 'google', ?, ?)
      `).run(
        userId,
        emailTrimmed,
        hash,
        salt,
        displayName,
        uid || null,
        now,
        now
      );

      db.prepare(`
        INSERT INTO profiles (user_id, bio, avatar, discord_tag, wallet_balance, kyc_status, total_orders, created_at)
        VALUES (?, 'Competitive Valorant Enthusiast', ?, NULL, 0.0, 'unverified', 0, ?)
      `).run(
        userId,
        resolvedAvatar || null,
        now
      );

      // Re-query newly created user by ID
      userRow = db.prepare(`
        SELECT u.id, u.email, u.name, u.phone, u.riot_id, u.role, u.status, u.email_verified, u.auth_provider,
               p.bio, p.avatar, p.discord_tag, p.wallet_balance, p.kyc_status, p.total_orders
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = ?
      `).get(userId) as any;
    }

    // Generate Session Token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, expiresAt, now);

    logAudit(userId, userRow.name, 'FIREBASE_GOOGLE_LOGIN', 'session', token, { email: emailTrimmed, provider: 'google' }, req.ip || '127.0.0.1');

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
app.post('/api/auth/logout', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    if (req.token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
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
app.post('/api/auth/forgot-password', (req: Request, res: Response): void => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  db.prepare('UPDATE users SET reset_token = ? WHERE email = ?').run(resetCode, String(email).trim().toLowerCase());
  res.json({
    message: 'If the email exists in our registry, a recovery instructions verification code has been dispatched.',
    demoCode: resetCode // surfaced for local inspection & automated testing
  });
});

// 6. Complete Password Reset
app.post('/api/auth/reset-password', (req: Request, res: Response): void => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    res.status(400).json({ error: 'Email, code, and new password are required.' });
    return;
  }
  const user = db.prepare('SELECT id, reset_token FROM users WHERE email = ?').get(String(email).trim().toLowerCase()) as any;
  if (!user || user.reset_token !== String(code).trim()) {
    res.status(400).json({ error: 'Invalid or expired verification reset code.' });
    return;
  }

  const { hash, salt } = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, salt = ?, reset_token = NULL, updated_at = ? WHERE id = ?')
    .run(hash, salt, new Date().toISOString(), user.id);

  res.json({ message: 'Password has been successfully updated. You may now log in.' });
});

// ==========================================
// USER DASHBOARD ROUTES
// ==========================================

// User Overview Data
app.get('/api/user/overview', authenticate, (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId);
  const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId);
  const tickets = db.prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5').all(userId);
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(userId);

  res.json({
    user: req.user,
    recentOrders: orders,
    recentTransactions: transactions,
    activeTickets: tickets,
    notifications
  });
});

// User Orders
app.get('/api/user/orders', authenticate, (req: AuthRequest, res: Response): void => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
  res.json({ orders });
});

// User Create Order (from CheckoutModal or cart) with Server-Side Price Verification & Auto Invoicing
app.post('/api/user/orders', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isCartOrder = req.body.type === 'cart' || (req.body.title && String(req.body.title).startsWith('Cart Checkout:'));
    const productId = req.body.product_id || req.body.package_id;
    let title = req.body.title || req.body.package_title;
    let amount = req.body.amount !== undefined ? req.body.amount : req.body.amount_inr;
    const currency = req.body.currency || 'INR';
    const type = req.body.type || (isCartOrder ? 'cart' : 'vp');
    const paymentMethod = req.body.paymentMethod || req.body.payment_method || 'UPI Instant';
    const details = req.body.details || {};

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
      details.riotVerified = true;
    }

    // Server-Side Price Validation against persistent database catalog
    if (productId) {
      const aliasMap: Record<string, string> = {
        viper: 'vp-475',
        neon: 'vp-1000',
        reyna: 'vp-2050',
        fade: 'vp-3650',
        jett: 'vp-5350',
        iso: 'vp-11000',
      };
      const resolvedId = aliasMap[productId] || productId;
      const catalogItem = db.prepare('SELECT * FROM products WHERE id = ?').get(resolvedId) as any;
      if (catalogItem) {
        if (!title) title = catalogItem.title;
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
      }
    }

    if (!title || amount === undefined || Number(amount) < 0) {
      res.status(400).json({ error: 'Valid title and price are required for order creation.' });
      return;
    }

    const orderId = 'ord_' + crypto.randomBytes(6).toString('hex');
    const txnId = 'txn_' + crypto.randomBytes(6).toString('hex');
    const refNo = 'VIB-' + Date.now().toString(36).toUpperCase();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO orders (id, user_id, type, title, amount, currency, status, payment_method, details_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, ?, ?, ?)
    `).run(
      orderId,
      req.user!.id,
      type,
      title,
      Number(amount),
      currency,
      paymentMethod,
      JSON.stringify(details),
      now,
      now
    );

    db.prepare(`
      INSERT INTO transactions (id, user_id, order_id, type, amount, currency, status, reference_no, created_at)
      VALUES (?, ?, ?, 'payment', ?, ?, 'success', ?, ?)
    `).run(
      txnId,
      req.user!.id,
      orderId,
      Number(amount),
      currency,
      refNo,
      now
    );

    // Increment profile orders
    db.prepare('UPDATE profiles SET total_orders = total_orders + 1 WHERE user_id = ?').run(req.user!.id);

    // Auto-generate Sequential Invoice (GST / Accounting Compliant)
    const invCount = (db.prepare('SELECT COUNT(*) as c FROM invoices').get() as any).c;
    const invoiceId = 'VIB-INV-' + String(invCount + 1).padStart(4, '0');
    const finalAmount = Number(amount);
    const subtotal = Math.round((finalAmount / 1.18) * 100) / 100;
    const taxAmount = Math.round((finalAmount - subtotal) * 100) / 100;

    db.prepare(`
      INSERT INTO invoices (
        id, order_id, customer_id, customer_name, customer_email, customer_phone,
        billing_address, seller_name, product_name, description, quantity,
        unit_price, subtotal, platform_fee, tax_amount, discount_amount, final_total,
        currency, status, payment_method, payment_reference, notes, invoice_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, ?, 0, ?, ?, 'paid', ?, ?, ?, ?, ?)
    `).run(
      invoiceId,
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
    db.prepare(`
      INSERT INTO order_messages (id, order_id, sender_id, sender_name, sender_role, message, flagged, created_at)
      VALUES (?, ?, 'system', 'VIB Dispatch System', 'system', ?, 0, ?)
    `).run(
      'msg_' + crypto.randomBytes(6).toString('hex'),
      orderId,
      `Order room initialized for #${orderId} (${title}). All deliveries, game account credentials, and communications are secured under official VIB middleman escrow. Please keep all communication inside this order room.`,
      now
    );

    // Send confirmation notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
      VALUES (?, ?, ?, ?, 'order', 0, ?)
    `).run(
      'notif_' + crypto.randomBytes(8).toString('hex'),
      req.user!.id,
      `Order Received: ${title}`,
      `Your order #${orderId} for ${currency} ${amount} is currently being processed by dispatch staff. Invoice #${invoiceId} generated.`,
      now
    );

    res.status(201).json({
      message: 'Order created successfully!',
      orderId,
      invoiceId,
      order: { id: orderId, title, amount: finalAmount, currency, status: 'processing', referenceNo: refNo },
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
app.get('/api/orders/:id/room', authenticate, (req: AuthRequest, res: Response): void => {
  const orderId = req.params.id;
  const order = db.prepare(`
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

  const messages = db.prepare(`
    SELECT * FROM order_messages WHERE order_id = ? ORDER BY created_at ASC
  `).all(orderId);

  res.json({
    order: { id: order.id, ...order },
    stages: [
      { key: 'placed', label: 'Payment Confirmed', completed: true },
      { key: 'verifying', label: 'Riot ID Verification', completed: true },
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
      paymentMethod: order.payment_method,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      buyer: {
        name: order.buyer_name,
        email: order.buyer_email,
        riotId: order.buyer_riot_id
      },
      details: order.details_json ? JSON.parse(order.details_json) : {},
      messages
    }
  });
});

// Post Message in Order Room (with Anti-Fraud Detection)
app.post('/api/orders/:id/messages', authenticate, (req: AuthRequest, res: Response): void => {
  const orderId = req.params.id;
  const { message, attachmentUrl } = req.body;

  if (!message || !String(message).trim()) {
    res.status(400).json({ error: 'Message text cannot be empty.' });
    return;
  }

  const order = db.prepare('SELECT user_id FROM orders WHERE id = ?').get(orderId) as any;
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

  // Run Anti-Fraud Scanner
  const scanResult = scanMessageForAntiFraud(String(message));
  const msgId = 'msg_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO order_messages (id, order_id, sender_id, sender_name, sender_role, message, attachment_url, flagged, flag_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    msgId,
    orderId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    String(message).trim(),
    attachmentUrl || null,
    scanResult.flagged ? 1 : 0,
    scanResult.reason || null,
    now
  );

  // If flagged, log audit warning
  if (scanResult.flagged) {
    logAudit(
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
});

// ==========================================
// INVOICES & BILLING ROUTES
// ==========================================

// Get Invoices for Authenticated Customer
app.get('/api/user/invoices', authenticate, (req: AuthRequest, res: Response): void => {
  const invoices = db.prepare('SELECT * FROM invoices WHERE customer_id = ? ORDER BY invoice_date DESC').all(req.user!.id);
  res.json({ invoices });
});

// Get Single Invoice Details (Customer or Staff)
app.get('/api/invoices/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as any;
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
});

// User Transactions
app.get('/api/user/transactions', authenticate, (req: AuthRequest, res: Response): void => {
  const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
  res.json({ transactions });
});

// User Tickets
app.get('/api/user/tickets', authenticate, (req: AuthRequest, res: Response): void => {
  const tickets = db.prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY updated_at DESC').all(req.user!.id);
  res.json({ tickets });
});

app.post('/api/user/tickets', authenticate, (req: AuthRequest, res: Response): void => {
  const { subject, category, message, priority, order_id } = req.body;
  if (!subject || !message) {
    res.status(400).json({ error: 'Subject and initial message are required.' });
    return;
  }
  const ticketId = 'tkt_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const initialMessages = JSON.stringify([
    { sender: 'user', senderName: req.user!.name, text: message, time: now }
  ]);

  db.prepare(`
    INSERT INTO support_tickets (id, user_id, subject, category, status, priority, messages_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?)
  `).run(
    ticketId,
    req.user!.id,
    subject,
    category || (order_id ? 'order' : 'general'),
    priority || 'medium',
    initialMessages,
    now,
    now
  );

  res.status(201).json({
    message: 'Support ticket submitted.',
    ticketId,
    ticket: { id: ticketId, subject, status: 'open' }
  });
});

// Update Profile
app.put('/api/user/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, bio, phone, riot_id, discord_tag } = req.body;
  const now = new Date().toISOString();

  let verifiedRiotId: string | null = null;
  let isRiotVerified = 0;

  if (riot_id !== undefined) {
    if (riot_id && String(riot_id).trim()) {
      const riotCheck = await verifyRiotId(String(riot_id).trim());
      if (!riotCheck.exists) {
        res.status(400).json({
          error: riotCheck.error || 'The provided Riot ID is not a legitimate Valorant account. Please check your username and tag.'
        });
        return;
      }
      verifiedRiotId = riotCheck.riotId;
      isRiotVerified = 1;
    }
  } else {
    const existing = db.prepare('SELECT riot_id, riot_verified FROM users WHERE id = ?').get(req.user!.id) as any;
    verifiedRiotId = existing?.riot_id || null;
    isRiotVerified = existing?.riot_verified || 0;
  }

  if (name) {
    db.prepare('UPDATE users SET name = ?, phone = ?, riot_id = ?, riot_verified = ?, updated_at = ? WHERE id = ?')
      .run(name, phone || null, verifiedRiotId, isRiotVerified, now, req.user!.id);
  } else if (riot_id !== undefined) {
    db.prepare('UPDATE users SET riot_id = ?, riot_verified = ?, updated_at = ? WHERE id = ?')
      .run(verifiedRiotId, isRiotVerified, now, req.user!.id);
  }

  db.prepare('UPDATE profiles SET bio = ?, discord_tag = ? WHERE user_id = ?')
    .run(bio || null, discord_tag || null, req.user!.id);

  const updatedUser = db.prepare(`
    SELECT u.id, u.email, u.name, u.phone, u.riot_id, u.riot_verified, u.role, u.status, u.email_verified,
           p.bio, p.avatar, p.discord_tag, p.wallet_balance, p.kyc_status, p.total_orders
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.id = ?
  `).get(req.user!.id);

  res.json({ message: 'Profile updated successfully.', user: updatedUser });
});

// Notifications
app.get('/api/user/notifications', authenticate, (req: AuthRequest, res: Response): void => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
  res.json({ notifications });
});

app.put('/api/user/notifications/:id/read', authenticate, (req: AuthRequest, res: Response): void => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  res.json({ success: true });
});

// ==========================================
// ADMIN DASHBOARD ROUTES
// ==========================================

const adminOnly = requireRole(['admin', 'superadmin', 'moderator']);
const superAdminOnly = requireRole(['superadmin']);

// 1. Admin Stats & Analytics
const getAdminStatsHandler = (req: AuthRequest, res: Response): void => {
  const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  const totalOrders = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as any).count;
  const completedOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").get() as any).count;
  const grossRevenue = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status != 'cancelled'").get() as any).total;
  const openDisputes = (db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'").get() as any).count;
  const activeSellers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'seller' AND status = 'active'").get() as any).count;

  const data = {
    totalUsers,
    totalOrders,
    completedOrders,
    grossRevenue,
    openDisputes,
    activeSellers
  };

  res.json({
    metrics: data,
    ...data
  });
};

app.get('/api/admin/stats', authenticate, adminOnly, getAdminStatsHandler);
app.get('/api/admin/metrics', authenticate, adminOnly, getAdminStatsHandler);

// 2. Admin Users Management
app.get('/api/admin/users', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const { search, role, status } = req.query;
  let query = `
    SELECT u.id, u.email, u.name, u.phone, u.riot_id, u.role, u.status, u.email_verified, u.created_at,
           p.wallet_balance, p.kyc_status, p.total_orders
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

  const users = db.prepare(query).all(...params);
  res.json({ users });
});

// 3. Admin Update User Status (Suspend/Ban/Activate)
app.put('/api/admin/users/:id/status', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const { status, reason } = req.body;
  const targetId = req.params.id;

  if (!['active', 'suspended', 'banned'].includes(status)) {
    res.status(400).json({ error: 'Invalid status.' });
    return;
  }

  const targetUser = db.prepare('SELECT role, email FROM users WHERE id = ?').get(targetId) as any;
  if (!targetUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Prevent ordinary admin from modifying superadmin
  if (targetUser.role === 'superadmin' && req.user!.role !== 'superadmin') {
    res.status(403).json({ error: 'Only Superadmin can modify another Superadmin.' });
    return;
  }

  db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), targetId);

  // If banned or suspended, invalidate all active sessions
  if (status !== 'active') {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);
  }

  logAudit(req.user!.id, req.user!.name, 'UPDATE_USER_STATUS', 'user', targetId, { newStatus: status, reason }, req.ip || '127.0.0.1');

  res.json({ message: `User status updated to ${status}.` });
});

// 4. Super Admin Role Management
app.put('/api/admin/users/:id/role', authenticate, superAdminOnly, (req: AuthRequest, res: Response): void => {
  const { role } = req.body;
  const targetId = req.params.id;

  if (!['user', 'seller', 'moderator', 'admin', 'superadmin'].includes(role)) {
    res.status(400).json({ error: 'Invalid role.' });
    return;
  }

  db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, new Date().toISOString(), targetId);

  logAudit(req.user!.id, req.user!.name, 'UPDATE_USER_ROLE', 'user', targetId, { newRole: role }, req.ip || '127.0.0.1');

  res.json({ message: `User role elevated/changed to ${role}.` });
});

// 5. Admin Orders Management
app.get('/api/admin/orders', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const orders = db.prepare(`
    SELECT o.*, u.email as user_email, u.name as user_name, u.riot_id as user_riot_id
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
    LIMIT 100
  `).all();

  res.json({ orders });
});

const updateOrderStatusHandler = (req: AuthRequest, res: Response): void => {
  const { status, note, admin_notes } = req.body;
  const orderId = req.params.id;
  const finalNote = note || admin_notes;

  if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
    res.status(400).json({ error: 'Invalid order status.' });
    return;
  }

  const order = db.prepare('SELECT user_id, title FROM orders WHERE id = ?').get(orderId) as any;
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), orderId);

  // Notify user
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(
    'notif_' + crypto.randomBytes(8).toString('hex'),
    order.user_id,
    `Order #${orderId} Updated`,
    `Status has been updated to ${status.toUpperCase()}. ${finalNote ? `Note: ${finalNote}` : ''}`,
    status === 'completed' ? 'success' : 'info',
    new Date().toISOString()
  );

  logAudit(req.user!.id, req.user!.name, 'UPDATE_ORDER_STATUS', 'order', orderId, { status, note: finalNote }, req.ip || '127.0.0.1');

  res.json({
    message: `Order #${orderId} status set to ${status}.`,
    order: { id: orderId, status, updated_at: new Date().toISOString() }
  });
};

app.put('/api/admin/orders/:id/status', authenticate, adminOnly, updateOrderStatusHandler);
app.put('/api/admin/orders/:id', authenticate, adminOnly, updateOrderStatusHandler);

// 6. Admin Transactions & Financial Ledger
app.get('/api/admin/transactions', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const transactions = db.prepare(`
    SELECT t.*, u.email as user_email, u.name as user_name
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
    LIMIT 100
  `).all();

  res.json({ transactions });
});

// 7. Admin Support Desk & Dispute Resolution
app.get('/api/admin/tickets', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const tickets = db.prepare(`
    SELECT t.*, u.email as user_email, u.name as user_name
    FROM support_tickets t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.updated_at DESC
    LIMIT 100
  `).all();

  res.json({ tickets });
});

app.put('/api/admin/tickets/:id', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const { status, replyText } = req.body;
  const ticketId = req.params.id;

  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as any;
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
  db.prepare(`
    UPDATE support_tickets
    SET status = ?, messages_json = ?, updated_at = ?
    WHERE id = ?
  `).run(newStatus, JSON.stringify(messages), now, ticketId);

  // Notify ticket creator
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
    VALUES (?, ?, ?, ?, 'info', 0, ?)
  `).run(
    'notif_' + crypto.randomBytes(8).toString('hex'),
    ticket.user_id,
    `Support Desk Update: ${ticket.subject}`,
    `Staff response received. Ticket status is now ${newStatus.toUpperCase()}.`,
    now
  );

  logAudit(req.user!.id, req.user!.name, 'RESOLVE_TICKET', 'ticket', ticketId, { status: newStatus }, req.ip || '127.0.0.1');

  res.json({ message: 'Ticket updated successfully.' });
});

// 8. Communication Center Announcements Dispatcher
app.post('/api/admin/announcements', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const { title, message } = req.body;
  const targetGroup = req.body.targetGroup || req.body.target || 'all';
  if (!title || !message) {
    res.status(400).json({ error: 'Title and message are required.' });
    return;
  }

  let usersQuery = "SELECT id FROM users WHERE status = 'active'";
  if (targetGroup === 'sellers') {
    usersQuery += " AND role = 'seller'";
  } else if (targetGroup === 'buyers' || targetGroup === 'users') {
    usersQuery += " AND role = 'user'";
  }

  const targetUsers = db.prepare(usersQuery).all() as { id: string }[];
  const now = new Date().toISOString();

  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
    VALUES (?, ?, ?, ?, 'info', 0, ?)
  `);

  targetUsers.forEach((u) => {
    insertNotif.run('notif_' + crypto.randomBytes(8).toString('hex'), u.id, title, message, now);
  });

  logAudit(req.user!.id, req.user!.name, 'DISPATCH_ANNOUNCEMENT', 'broadcast', targetGroup || 'all', { recipientCount: targetUsers.length }, req.ip || '127.0.0.1');

  res.json({
    message: `Announcement dispatched to ${targetUsers.length} user(s).`,
    recipientCount: targetUsers.length
  });
});

// 9. System Audit Logs
app.get('/api/admin/audit-logs', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
  res.json({ logs });
});

// ==========================================
// 10. ADMIN INVOICE MANAGEMENT & MANUAL BILLING
// ==========================================

// List All Invoices
app.get('/api/admin/invoices', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const invoices = db.prepare('SELECT * FROM invoices ORDER BY invoice_date DESC LIMIT 100').all();
  res.json({ invoices });
});

// Manual Invoice Creator (from requirements: manual billing system)
app.post('/api/admin/invoices', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
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

    const invCount = (db.prepare('SELECT COUNT(*) as c FROM invoices').get() as any).c;
    const invoiceId = 'VIB-INV-' + String(invCount + 1).padStart(4, '0');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO invoices (
        id, order_id, customer_id, customer_name, customer_email, customer_phone,
        billing_address, seller_name, product_name, description, quantity,
        unit_price, subtotal, platform_fee, tax_amount, discount_amount, final_total,
        currency, status, payment_method, payment_reference, notes, invoice_date, created_at
      ) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId,
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

    logAudit(
      req.user!.id,
      req.user!.name,
      'CREATE_MANUAL_INVOICE',
      'invoice',
      invoiceId,
      { finalTotal, customerName, customerEmail },
      req.ip || '127.0.0.1'
    );

    const invRow = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any;

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

app.get('/api/admin/finance/overview', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const grossBuyerPaid = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status != 'cancelled'").get() as any).total;
  const totalCompletedOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").get() as any).count;
  const totalInvoicesPaid = (db.prepare("SELECT COALESCE(SUM(final_total), 0) as total FROM invoices WHERE status = 'paid'").get() as any).total;
  const totalTaxCollected = (db.prepare("SELECT COALESCE(SUM(tax_amount), 0) as total FROM invoices").get() as any).total;
  const totalExpenses = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses").get() as any).total;
  const platformCommissions = Math.round(grossBuyerPaid * 0.10); // 10% standard platform commission
  const sellerEarnings = grossBuyerPaid - platformCommissions;
  const netProfit = platformCommissions - totalExpenses;

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
      settlementQueueCount: 3,
      currency: 'INR'
    }
  });
});

app.get('/api/admin/finance/expenses', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC LIMIT 100').all();
  res.json({ expenses });
});

app.post('/api/admin/finance/expenses', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const { category, description, amount, paymentMethod, referenceNo } = req.body;
  if (!category || !description || amount === undefined) {
    res.status(400).json({ error: 'Category, description, and amount are required.' });
    return;
  }

  const expId = 'exp_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
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

  logAudit(req.user!.id, req.user!.name, 'RECORD_EXPENSE', 'expense', expId, { amount, category }, req.ip || '127.0.0.1');

  const expRow = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expId);

  res.status(201).json({
    message: 'Expense record logged successfully.',
    expenseId: expId,
    expense: expRow
  });
});

app.get('/api/admin/finance/settlements', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const settlements = [
    {
      id: 'stl_001',
      sellerName: 'Radiant Market Seller',
      sellerEmail: 'seller@vib.gg',
      amount: 14200.0,
      bankAccount: 'HDFC Bank (A/C: ****4921, IFSC: HDFC0001092)',
      upiId: 'radiantseller@okhdfcbank',
      status: 'pending_release',
      payoutMethod: 'UPI Instant Payout',
      scheduledDate: new Date(Date.now() + 86400000).toISOString()
    },
    {
      id: 'stl_002',
      sellerName: 'Apex Skin Collector',
      sellerEmail: 'apex_skins@vib.gg',
      amount: 8900.0,
      bankAccount: 'ICICI Bank (A/C: ****8812, IFSC: ICIC0000128)',
      upiId: 'apexskins@icici',
      status: 'completed',
      payoutMethod: 'IMPS Bank Transfer',
      scheduledDate: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ];
  res.json({ settlements });
});

// ==========================================
// 12. EMPLOYEE TASK MANAGEMENT SYSTEM
// ==========================================

app.get('/api/admin/tasks', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
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
  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

app.post('/api/admin/tasks', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const { title, description, department, priority, notes } = req.body;
  const assignedTo = req.body.assignedTo || req.body.assigned_to;
  const dueDate = req.body.dueDate || req.body.due_date;

  if (!title || !department) {
    res.status(400).json({ error: 'Title and department are required.' });
    return;
  }

  const taskId = 'task_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
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

  logAudit(req.user!.id, req.user!.name, 'CREATE_STAFF_TASK', 'task', taskId, { title, department }, req.ip || '127.0.0.1');

  const taskRow = db.prepare('SELECT * FROM staff_tasks WHERE id = ?').get(taskId);

  res.status(201).json({
    message: 'Task created.',
    taskId,
    task: taskRow
  });
});

app.put('/api/admin/tasks/:id', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const { status, notes } = req.body;
  const taskId = req.params.id;

  const task = db.prepare('SELECT id FROM staff_tasks WHERE id = ?').get(taskId);
  if (!task) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }

  db.prepare('UPDATE staff_tasks SET status = COALESCE(?, status), notes = COALESCE(?, notes), updated_at = ? WHERE id = ?')
    .run(status || null, notes || null, new Date().toISOString(), taskId);

  const taskRow = db.prepare('SELECT * FROM staff_tasks WHERE id = ?').get(taskId);

  res.json({
    message: 'Task updated successfully.',
    task: taskRow
  });
});

// ==========================================
// 13. CUSTOMER CRM & FRAUD PREVENTION
// ==========================================

app.get('/api/admin/users/:id/crm', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const userId = req.params.id;
  const user = db.prepare(`
    SELECT u.id, u.email, u.name, u.phone, u.riot_id, u.role, u.status, u.created_at,
           p.wallet_balance, p.kyc_status, p.total_orders, p.discord_tag, p.bio
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.id = ?
  `).get(userId) as any;

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const notes = db.prepare('SELECT * FROM user_crm_notes WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const totalSpent = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE user_id = ? AND status != 'cancelled'").get(userId) as any).total;
  const disputeCount = (db.prepare('SELECT COUNT(*) as count FROM support_tickets WHERE user_id = ?').get(userId) as any).count;

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
});

app.post('/api/admin/users/:id/crm/notes', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const userId = req.params.id;
  const { note, riskLevel } = req.body;

  if (!note || !String(note).trim()) {
    res.status(400).json({ error: 'Note text cannot be empty.' });
    return;
  }

  const noteId = 'crm_note_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
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

  logAudit(req.user!.id, req.user!.name, 'ADD_CRM_NOTE', 'user', userId, { noteId, riskLevel }, req.ip || '127.0.0.1');

  const noteRow = db.prepare('SELECT * FROM user_crm_notes WHERE id = ?').get(noteId);

  res.status(201).json({
    message: 'Internal staff note attached to customer profile.',
    noteId,
    note: noteRow
  });
});

// ==========================================
// 14. COMMUNICATION CENTER & EMAIL TEMPLATES
// ==========================================

app.get('/api/admin/communication/templates', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const templates = db.prepare('SELECT * FROM email_templates ORDER BY category ASC').all().map((t: any) => ({
    ...t,
    variables: t.variables_json ? JSON.parse(t.variables_json) : []
  }));
  res.json({ templates });
});

app.put('/api/admin/communication/templates/:id', authenticate, adminOnly, (req: AuthRequest, res: Response): void => {
  const { subject, body } = req.body;
  const templateId = req.params.id;

  const tpl = db.prepare('SELECT id FROM email_templates WHERE id = ?').get(templateId);
  if (!tpl) {
    res.status(404).json({ error: 'Template not found.' });
    return;
  }

  db.prepare('UPDATE email_templates SET subject = COALESCE(?, subject), body = COALESCE(?, body), updated_at = ? WHERE id = ?')
    .run(subject || null, body || null, new Date().toISOString(), templateId);

  const tplRow = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(templateId);

  res.json({
    message: 'Email template updated successfully.',
    template: tplRow
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`[VIB Server] Production Backend running at http://localhost:${PORT}`);
});
