import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db, hashPassword, verifyPassword, generateToken, seedDatabase } from './db.js';

// Initialize and seed database
seedDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req: Request, res: Response): void => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
           u.id, u.email, u.name, u.phone, u.riot_id, u.role, u.status, u.email_verified,
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

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// 1. Register
app.post('/api/auth/register', (req: Request, res: Response): void => {
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

    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
    const { hash, salt } = hashPassword(password);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();

    // Default public registrations are 'user' (NEVER admin)
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, phone, riot_id, role, status, email_verified, verification_code, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'user', 'active', 1, ?, ?, ?)
    `).run(
      userId,
      emailTrimmed,
      hash,
      salt,
      String(name).trim(),
      phone ? String(phone).trim() : null,
      riot_id ? String(riot_id).trim() : null,
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
        riot_id: riot_id ? String(riot_id).trim() : null,
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

// User Create Order (from CheckoutModal or cart)
app.post('/api/user/orders', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const title = req.body.title || req.body.package_title;
    const amount = req.body.amount !== undefined ? req.body.amount : req.body.amount_inr;
    const currency = req.body.currency || 'INR';
    const type = req.body.type || 'vp';
    const paymentMethod = req.body.paymentMethod || req.body.payment_method || 'UPI Instant';
    const details = req.body.details || {};

    if (!title || amount === undefined) {
      res.status(400).json({ error: 'Title and amount are required.' });
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

    // Send confirmation notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
      VALUES (?, ?, ?, ?, 'order', 0, ?)
    `).run(
      'notif_' + crypto.randomBytes(8).toString('hex'),
      req.user!.id,
      `Order Received: ${title}`,
      `Your order #${orderId} for ${currency} ${amount} is currently being processed by dispatch staff.`,
      now
    );

    res.status(201).json({
      message: 'Order created successfully!',
      orderId,
      order: { id: orderId, title, amount, currency, status: 'processing', referenceNo: refNo },
      referenceNo: refNo
    });
  } catch (err: any) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to create order.' });
  }
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
app.put('/api/user/profile', authenticate, (req: AuthRequest, res: Response): void => {
  const { name, bio, phone, riot_id, discord_tag } = req.body;
  const now = new Date().toISOString();

  if (name) {
    db.prepare('UPDATE users SET name = ?, phone = ?, riot_id = ?, updated_at = ? WHERE id = ?')
      .run(name, phone || null, riot_id || null, now, req.user!.id);
  }

  db.prepare('UPDATE profiles SET bio = ?, discord_tag = ? WHERE user_id = ?')
    .run(bio || null, discord_tag || null, req.user!.id);

  const updatedUser = db.prepare(`
    SELECT u.id, u.email, u.name, u.phone, u.riot_id, u.role, u.status, u.email_verified,
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

// Start Express Server
app.listen(PORT, () => {
  console.log(`[VIB Server] Production Backend running at http://localhost:${PORT}`);
});
