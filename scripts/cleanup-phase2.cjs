const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.resolve(__dirname, '..', 'data', 'vib.db'));

console.log('=== Phase 2 Cleanup: Fake invoices, email logs, excess notifications ===');

db.exec('BEGIN TRANSACTION');
try {
  // 1. Remove fake "Custom Corporate Client" invoices (test-generated, no real order)
  const fakeInvoices = db.prepare(`SELECT COUNT(*) as c FROM invoices WHERE customer_name = 'Custom Corporate Client' AND order_id IS NULL`).get().c;
  db.prepare(`DELETE FROM invoices WHERE customer_name = 'Custom Corporate Client' AND order_id IS NULL`).run();
  console.log(`  Deleted ${fakeInvoices} fake 'Custom Corporate Client' invoices.`);

  // 2. Clean email logs from test addresses
  const fakeEmails = db.prepare(`SELECT COUNT(*) as c FROM email_logs WHERE recipient LIKE '%testcustomer@%' OR recipient LIKE '%phptester@%'`).get().c;
  db.prepare(`DELETE FROM email_logs WHERE recipient LIKE '%testcustomer@%' OR recipient LIKE '%phptester@%'`).run();
  console.log(`  Deleted ${fakeEmails} email logs from test addresses.`);

  // 3. Trim excessive admin email logs (keep latest 50)
  const adminEmails = db.prepare(`SELECT COUNT(*) as c FROM email_logs WHERE recipient = 'thevibofficial@gmail.com'`).get().c;
  if (adminEmails > 50) {
    db.prepare(`
      DELETE FROM email_logs WHERE recipient = 'thevibofficial@gmail.com' AND id NOT IN (
        SELECT id FROM email_logs WHERE recipient = 'thevibofficial@gmail.com' ORDER BY sent_at DESC LIMIT 50
      )
    `).run();
    console.log(`  Trimmed admin email logs from ${adminEmails} to 50.`);
  }

  // 4. Trim excessive notifications per user to last 20 each  
  const userNotifCounts = db.prepare(`SELECT user_id, COUNT(*) as c FROM notifications GROUP BY user_id HAVING c > 20`).all();
  for (const row of userNotifCounts) {
    db.prepare(`
      DELETE FROM notifications WHERE user_id = ? AND id NOT IN (
        SELECT id FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
      )
    `).run(row.user_id, row.user_id);
    console.log(`  Trimmed notifications for ${row.user_id}: ${row.c} → 20.`);
  }

  // 5. Trim excessive audit logs (keep latest 100)
  const auditTotal = db.prepare(`SELECT COUNT(*) as c FROM audit_logs`).get().c;
  if (auditTotal > 100) {
    db.prepare(`
      DELETE FROM audit_logs WHERE id NOT IN (
        SELECT id FROM audit_logs ORDER BY created_at DESC LIMIT 100
      )
    `).run();
    console.log(`  Trimmed audit logs from ${auditTotal} to 100.`);
  }

  // 6. Clean stale sessions (keep only latest 5 per user)
  const sessUsers = db.prepare(`SELECT user_id, COUNT(*) as c FROM sessions GROUP BY user_id HAVING c > 5`).all();
  for (const row of sessUsers) {
    db.prepare(`
      DELETE FROM sessions WHERE user_id = ? AND token NOT IN (
        SELECT token FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
      )
    `).run(row.user_id, row.user_id);
    console.log(`  Trimmed sessions for ${row.user_id}: ${row.c} → 5.`);
  }

  db.exec('COMMIT');
  console.log('\n✅ Phase 2 cleanup committed.');
} catch (err) {
  db.exec('ROLLBACK');
  console.error('❌ Phase 2 cleanup failed:', err);
  process.exit(1);
}

// Final counts
console.log('\n📊 Final Clean State:');
console.log(`  Users:           ${db.prepare('SELECT COUNT(*) as c FROM users').get().c}`);
console.log(`  Orders:          ${db.prepare('SELECT COUNT(*) as c FROM orders').get().c}`);
console.log(`  Transactions:    ${db.prepare('SELECT COUNT(*) as c FROM transactions').get().c}`);
console.log(`  Invoices:        ${db.prepare('SELECT COUNT(*) as c FROM invoices').get().c}`);
console.log(`  Support Tickets: ${db.prepare('SELECT COUNT(*) as c FROM support_tickets').get().c}`);
console.log(`  Notifications:   ${db.prepare('SELECT COUNT(*) as c FROM notifications').get().c}`);
console.log(`  Email Logs:      ${db.prepare('SELECT COUNT(*) as c FROM email_logs').get().c}`);
console.log(`  Audit Logs:      ${db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c}`);
console.log(`  Sessions:        ${db.prepare('SELECT COUNT(*) as c FROM sessions').get().c}`);
console.log(`  Listings:        ${db.prepare('SELECT COUNT(*) as c FROM listings').get().c}`);
