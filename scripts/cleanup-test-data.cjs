/**
 * VIB 2.0 — Production Data Cleanup & Fix Script
 * 
 * This script:
 * 1. Archives test data (users, orders, transactions, invoices, tickets, notifications, email logs, sessions)
 * 2. Removes test-generated records while preserving legitimate data
 * 3. Recalculates profile statistics from authoritative order data
 * 4. Cleans up orphaned VP codes issued to test orders
 * 5. Ensures dashboard metrics reflect real state
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '..', 'data', 'vib.db');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// =====================================================
// 1. IDENTIFY TEST DATA
// =====================================================
console.log('\n=== Phase 1: Identifying test data ===');

const testUserIds = db.prepare(`
  SELECT id FROM users
  WHERE email LIKE '%vib-test.gg'
     OR email LIKE 'new_google_%@gmail.com'
`).all().map(r => r.id);

console.log(`Found ${testUserIds.length} test user accounts to clean up.`);

// Legitimate users (preserved)
const legitUsers = db.prepare(`
  SELECT id, email, name, role FROM users
  WHERE email NOT LIKE '%vib-test.gg'
    AND email NOT LIKE 'new_google_%@gmail.com'
`).all();
console.log(`Preserving ${legitUsers.length} legitimate users:`);
legitUsers.forEach(u => console.log(`  - ${u.role.padEnd(12)} ${u.email.padEnd(35)} ${u.name}`));

// Count test data
const testOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com')`).get().c;
const testTransactions = db.prepare(`SELECT COUNT(*) as c FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com')`).get().c;
const testInvoices = db.prepare(`SELECT COUNT(*) as c FROM invoices WHERE customer_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com')`).get().c;
const testTickets = db.prepare(`SELECT COUNT(*) as c FROM support_tickets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com')`).get().c;
const testNotifs = db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com')`).get().c;
const testVPIssued = db.prepare(`SELECT COUNT(*) as c FROM vp_codes WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'))`).get().c;

console.log(`\nTest data to remove:`);
console.log(`  - ${testOrders} orders`);
console.log(`  - ${testTransactions} transactions`);
console.log(`  - ${testInvoices} invoices`);
console.log(`  - ${testTickets} support tickets`);
console.log(`  - ${testNotifs} notifications`);
console.log(`  - ${testVPIssued} VP codes issued to test orders`);

// =====================================================
// 2. CREATE BACKUP
// =====================================================
console.log('\n=== Phase 2: Creating database backup ===');
const backupPath = path.resolve(__dirname, '..', 'data', `vib_backup_${Date.now()}.db`);
fs.copyFileSync(dbPath, backupPath);
console.log(`Backup saved: ${backupPath}`);

// =====================================================
// 3. TRANSACTIONAL CLEANUP
// =====================================================
console.log('\n=== Phase 3: Cleaning test data (transactional) ===');

db.exec('BEGIN TRANSACTION');
try {
  // 3a. Release VP codes that were issued to test orders (make them available again)
  const vpCodesReleasedInfo = db.prepare(`
    SELECT id, code, package_id FROM vp_codes
    WHERE order_id IN (
      SELECT id FROM orders WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
      )
    )
  `).all();
  
  db.prepare(`
    UPDATE vp_codes
    SET status = 'available', order_id = NULL, issued_at = NULL, reserved_at = NULL
    WHERE order_id IN (
      SELECT id FROM orders WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
      )
    )
  `).run();
  console.log(`  Released ${vpCodesReleasedInfo.length} VP codes back to available inventory.`);

  // 3b. Delete order messages from test orders
  const testOrderIds = db.prepare(`
    SELECT id FROM orders WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
    )
  `).all().map(r => r.id);
  
  if (testOrderIds.length > 0) {
    // Chunk delete to avoid SQLite parameter limits
    const CHUNK = 100;
    for (let i = 0; i < testOrderIds.length; i += CHUNK) {
      const chunk = testOrderIds.slice(i, i + CHUNK);
      const placeholders = chunk.map(() => '?').join(',');
      db.prepare(`DELETE FROM order_messages WHERE order_id IN (${placeholders})`).run(...chunk);
    }
    console.log(`  Deleted order messages for ${testOrderIds.length} test orders.`);
  }

  // 3c. Delete test invoices
  db.prepare(`
    DELETE FROM invoices WHERE customer_id IN (
      SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
    )
  `).run();
  console.log(`  Deleted ${testInvoices} test invoices.`);

  // 3d. Delete test transactions
  db.prepare(`
    DELETE FROM transactions WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
    )
  `).run();
  console.log(`  Deleted ${testTransactions} test transactions.`);

  // 3e. Delete test orders
  db.prepare(`
    DELETE FROM orders WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
    )
  `).run();
  console.log(`  Deleted ${testOrders} test orders.`);

  // 3f. Delete test support tickets
  db.prepare(`
    DELETE FROM support_tickets WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
    )
  `).run();
  console.log(`  Deleted ${testTickets} test support tickets.`);

  // 3g. Delete test notifications
  db.prepare(`
    DELETE FROM notifications WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
    )
  `).run();
  console.log(`  Deleted ${testNotifs} test notifications.`);

  // 3h. Delete test auction bids (from non-existent users)
  db.prepare(`
    DELETE FROM auction_bids WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
    )
  `).run();
  console.log(`  Deleted test auction bids.`);

  // 3i. Delete test sessions  
  db.prepare(`
    DELETE FROM sessions WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
    )
  `).run();
  console.log(`  Deleted test sessions.`);

  // 3j. Delete test profiles
  db.prepare(`
    DELETE FROM profiles WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
    )
  `).run();
  console.log(`  Deleted test profiles.`);

  // 3k. Delete CRM notes for test users
  db.prepare(`
    DELETE FROM user_crm_notes WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
    )
  `).run();
  console.log(`  Deleted test CRM notes.`);

  // 3l. Delete test user accounts last (FK cascade)
  db.prepare(`
    DELETE FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com'
  `).run();
  console.log(`  Deleted ${testUserIds.length} test user accounts.`);

  // 3m. Clean up stale sessions (expired or for deleted users)
  db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
  db.prepare(`DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users)`).run();
  console.log(`  Cleaned up stale/orphaned sessions.`);

  // 3n. Clean up email logs from test users
  const testEmailLogs = db.prepare(`
    SELECT COUNT(*) as c FROM email_logs WHERE recipient LIKE '%vib-test.gg' OR recipient LIKE 'new_google_%@gmail.com'
  `).get().c;
  db.prepare(`
    DELETE FROM email_logs WHERE recipient LIKE '%vib-test.gg' OR recipient LIKE 'new_google_%@gmail.com'
  `).run();
  console.log(`  Deleted ${testEmailLogs} test email log entries.`);

  // 3o. Clean audit logs generated by test operations (keep system init and legitimate actions)
  const testAuditLogs = db.prepare(`
    SELECT COUNT(*) as c FROM audit_logs 
    WHERE actor_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%@gmail.com')
       OR (actor_id NOT IN (SELECT id FROM users) AND actor_id != 'system' AND actor_id NOT LIKE 'usr_superadmin%' AND actor_id NOT LIKE 'usr_mod%' AND actor_id NOT LIKE 'usr_seller%' AND actor_id NOT LIKE 'usr_customer%')
  `).get().c;
  // Keep audit logs from legitimate users but remove test-generated ones
  db.prepare(`
    DELETE FROM audit_logs 
    WHERE actor_id NOT IN (SELECT id FROM users)
      AND actor_id != 'system'
      AND actor_name != 'system'
      AND actor_id NOT LIKE 'usr_superadmin%'
      AND actor_id NOT LIKE 'usr_mod%'
      AND actor_id NOT LIKE 'usr_seller%'
      AND actor_id NOT LIKE 'usr_customer%'
  `).run();
  console.log(`  Cleaned orphaned audit log entries.`);

  db.exec('COMMIT');
  console.log('\n✅ Test data cleanup committed successfully.');
} catch (err) {
  db.exec('ROLLBACK');
  console.error('\n❌ Cleanup failed, rolled back:', err);
  process.exit(1);
}

// =====================================================
// 4. RECALCULATE PROFILE STATISTICS
// =====================================================
console.log('\n=== Phase 4: Recalculating profile statistics ===');

const allUsers = db.prepare('SELECT id, email FROM users').all();
for (const u of allUsers) {
  const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders WHERE user_id = ?').get(u.id).c;
  db.prepare('UPDATE profiles SET total_orders = ? WHERE user_id = ?').run(orderCount, u.id);
}
console.log(`  Updated total_orders for ${allUsers.length} user profiles.`);

// =====================================================
// 5. FIX SEED ORDER PAYMENT STATUS
// =====================================================
console.log('\n=== Phase 5: Fixing seed order payment statuses ===');

// The seed order ord_1001 is 'completed' but has payment_status 'AWAITING_PAYMENT' — fix it
const seedCompleted = db.prepare(`
  SELECT id FROM orders WHERE status = 'completed' AND payment_status = 'AWAITING_PAYMENT'
`).all();
if (seedCompleted.length > 0) {
  db.prepare(`
    UPDATE orders SET payment_status = 'PAYMENT_VERIFIED' WHERE status = 'completed' AND payment_status = 'AWAITING_PAYMENT'
  `).run();
  console.log(`  Fixed ${seedCompleted.length} completed orders with incorrect AWAITING_PAYMENT status.`);
}

// =====================================================
// 6. FINAL VERIFICATION
// =====================================================
console.log('\n=== Phase 6: Final verification ===');

const finalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
const finalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
const finalTransactions = db.prepare('SELECT COUNT(*) as c FROM transactions').get().c;
const finalInvoices = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
const finalTickets = db.prepare('SELECT COUNT(*) as c FROM support_tickets').get().c;
const finalNotifs = db.prepare('SELECT COUNT(*) as c FROM notifications').get().c;
const finalVPAvail = db.prepare("SELECT COUNT(*) as c FROM vp_codes WHERE status = 'available'").get().c;
const finalVPIssued = db.prepare("SELECT COUNT(*) as c FROM vp_codes WHERE status = 'issued'").get().c;
const finalListings = db.prepare('SELECT COUNT(*) as c FROM listings').get().c;
const finalSessions = db.prepare('SELECT COUNT(*) as c FROM sessions').get().c;
const finalEmailLogs = db.prepare('SELECT COUNT(*) as c FROM email_logs').get().c;
const finalAuditLogs = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;

console.log(`\n📊 Clean Database State:`);
console.log(`  Users:           ${finalUsers}`);
console.log(`  Orders:          ${finalOrders}`);
console.log(`  Transactions:    ${finalTransactions}`);
console.log(`  Invoices:        ${finalInvoices}`);
console.log(`  Support Tickets: ${finalTickets}`);
console.log(`  Notifications:   ${finalNotifs}`);
console.log(`  VP Codes:        ${finalVPAvail} available, ${finalVPIssued} issued`);
console.log(`  Listings:        ${finalListings}`);
console.log(`  Sessions:        ${finalSessions}`);
console.log(`  Email Logs:      ${finalEmailLogs}`);
console.log(`  Audit Logs:      ${finalAuditLogs}`);

// Verify remaining data
console.log('\n📋 Remaining Users:');
db.prepare('SELECT id, email, name, role, status FROM users ORDER BY created_at ASC').all().forEach(u => {
  console.log(`  ${u.role.padEnd(12)} ${u.email.padEnd(35)} ${u.name} (${u.status})`);
});

console.log('\n📋 Remaining Orders:');
db.prepare('SELECT id, user_id, type, title, amount, status, payment_status FROM orders ORDER BY created_at ASC').all().forEach(o => {
  console.log(`  ${o.id.padEnd(20)} ${o.type.padEnd(10)} ₹${o.amount} ${o.status}/${o.payment_status}`);
});

console.log('\n📋 VP Inventory by Package:');
db.prepare(`
  SELECT CASE WHEN package_id = 'in-7400' THEN 'vp-7400' ELSE package_id END as pkg,
         SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as avail,
         SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued,
         COUNT(*) as total
  FROM vp_codes
  GROUP BY pkg
  ORDER BY pkg
`).all().forEach(r => {
  console.log(`  ${r.pkg.padEnd(12)} ${r.avail} available, ${r.issued} issued (${r.total} total)`);
});

console.log('\n✅ Database cleanup complete.');
