const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/vib.db');

console.log('\n=== ORDER STATUS BREAKDOWN ===');
db.prepare(`SELECT status, payment_status, COUNT(*) as c FROM orders GROUP BY status, payment_status ORDER BY c DESC`).all().forEach(x => console.log(x));

console.log('\n=== TEST vs REAL ORDERS ===');
const testOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%')`).get();
console.log('Test orders:', testOrders);
const legitOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE user_id NOT IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%')`).get();
console.log('Legit orders:', legitOrders);

console.log('\n=== TEST vs REAL USERS ===');
const testUsers = db.prepare(`SELECT COUNT(*) as c FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%'`).get();
console.log('Test users:', testUsers);
const legitUsers = db.prepare(`SELECT COUNT(*) as c FROM users WHERE email NOT LIKE '%vib-test.gg' AND email NOT LIKE 'new_google_%'`).get();
console.log('Legit users:', legitUsers);

console.log('\n=== LISTINGS BREAKDOWN ===');
db.prepare(`SELECT status, seller_role, COUNT(*) as c FROM listings GROUP BY status, seller_role`).all().forEach(x => console.log(x));

console.log('\n=== INVOICES BREAKDOWN ===');
const testInvoices = db.prepare(`SELECT COUNT(*) as c FROM invoices WHERE customer_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%')`).get();
console.log('Test invoices:', testInvoices);
const legitInvoices = db.prepare(`SELECT COUNT(*) as c FROM invoices WHERE customer_id NOT IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%') OR customer_id IS NULL`).get();
console.log('Legit invoices:', legitInvoices);

console.log('\n=== TRANSACTIONS BREAKDOWN ===');
const testTxns = db.prepare(`SELECT COUNT(*) as c FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%')`).get();
console.log('Test transactions:', testTxns);
const legitTxns = db.prepare(`SELECT COUNT(*) as c FROM transactions WHERE user_id NOT IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%')`).get();
console.log('Legit transactions:', legitTxns);

console.log('\n=== SUPPORT TICKETS BREAKDOWN ===');
const testTickets = db.prepare(`SELECT COUNT(*) as c FROM support_tickets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%')`).get();
console.log('Test tickets:', testTickets);
const legitTickets = db.prepare(`SELECT COUNT(*) as c FROM support_tickets WHERE user_id NOT IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%')`).get();
console.log('Legit tickets:', legitTickets);

console.log('\n=== VP CODES ISSUED TO TEST USERS ===');
const testVPIssued = db.prepare(`SELECT COUNT(*) as c FROM vp_codes WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%'))`).get();
console.log('VP codes issued to test orders:', testVPIssued);

console.log('\n=== NOTIFICATION BREAKDOWN ===');
const testNotifs = db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%')`).get();
console.log('Test notifications:', testNotifs);
const legitNotifs = db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE user_id NOT IN (SELECT id FROM users WHERE email LIKE '%vib-test.gg' OR email LIKE 'new_google_%')`).get();
console.log('Legit notifications:', legitNotifs);

console.log('\n=== EMAIL LOGS ===');
console.log('Email logs:', db.prepare(`SELECT COUNT(*) as c FROM email_logs`).get());

console.log('\n=== SESSIONS ===');
console.log('Active sessions:', db.prepare(`SELECT COUNT(*) as c FROM sessions`).get());

console.log('\n=== AUTH CONTEXT: Check token/session persist ===');
// Check if there's a rammodhvadiya210 user
const realUser = db.prepare(`SELECT id, email, name, role, status FROM users WHERE email = 'rammodhvadiya210@gmail.com'`).get();
console.log('Real user account:', realUser);

console.log('\n=== ORDERS from real user (customer@vib.gg) ===');
db.prepare(`SELECT id, type, title, amount, status, payment_status FROM orders WHERE user_id = 'usr_customer_04' ORDER BY created_at DESC LIMIT 10`).all().forEach(x => console.log(x));
