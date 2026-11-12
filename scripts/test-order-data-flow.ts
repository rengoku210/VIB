import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const projectRoot = process.cwd();
const tempDir = await mkdtemp(path.join(tmpdir(), 'vib-order-flow-'));
const dbPath = path.join(tempDir, 'vib-test.db');
const port = 20_000 + Math.floor(Math.random() * 20_000);
const baseUrl = `http://127.0.0.1:${port}`;
let server: ChildProcess | undefined;
let serverOutput = '';

// Simulate a legacy login audit row that previously stored its bearer token.
const legacyLoginToken = 'legacy-session-token-that-must-be-redacted';
const fixtureDb = new DatabaseSync(dbPath);
fixtureDb.exec(`
  CREATE TABLE audit_logs (
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
`);
fixtureDb.prepare(`
  INSERT INTO audit_logs (id, actor_id, actor_name, action, target_type, target_id, details_json, ip_address, created_at)
  VALUES ('legacy-login', 'legacy-user', 'Legacy User', 'USER_LOGIN', 'session', ?, '{}', '127.0.0.1', ?)
`).run(legacyLoginToken, new Date().toISOString());
fixtureDb.close();

async function request(urlPath: string, options: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) {
      throw new Error(`Test server exited early.\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for the isolated test server.\n${serverOutput}`);
}

try {
  server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server/index.ts'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      SESSION_SECRET: 'isolated-test-only-session-secret',
      RIOT_API_KEY: '',
      HENRIK_API_KEY: '',
      SMTP_HOST: '',
      SMTP_USER: '',
      SMTP_PASS: '',
      SMTP_FROM: '',
      RESEND_API_KEY: '',
      RESEND_FROM_EMAIL: '',
      VIB_DATABASE_PATH: dbPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout?.on('data', (chunk: Buffer) => { serverOutput = (serverOutput + chunk.toString()).slice(-6000); });
  server.stderr?.on('data', (chunk: Buffer) => { serverOutput = (serverOutput + chunk.toString()).slice(-6000); });
  await waitForServer();

  const freshInventoryDb = new DatabaseSync(dbPath, { readOnly: true });
  assert.equal((freshInventoryDb.prepare('SELECT COUNT(*) AS count FROM vp_codes').get() as any).count, 0, 'fresh databases must not invent redeemable VP PINs');
  freshInventoryDb.close();

  const passwordRecovery = await request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'customer@vib.gg' }),
  });
  assert.equal(passwordRecovery.status, 503, 'local password recovery must report unavailable when email delivery is not configured');
  assert.equal(passwordRecovery.body.demoCode, undefined, 'password recovery must never disclose a reset code in the API response');
  const invalidReset = await request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'customer@vib.gg', code: '123456', newPassword: 'ChangedPassword123' }),
  });
  assert.equal(invalidReset.status, 400, 'password reset must reject missing or expired hashed recovery codes');

  const seedStateDb = new DatabaseSync(dbPath, { readOnly: true });
  const paidSeed = seedStateDb.prepare(`
    SELECT o.payment_status, o.fulfillment_status, t.status AS transaction_status, i.status AS invoice_status
    FROM orders o
    JOIN transactions t ON t.order_id = o.id
    JOIN invoices i ON i.order_id = o.id
    WHERE o.id = 'ord_1001'
  `).get() as any;
  assert.deepEqual({ ...paidSeed }, {
    payment_status: 'PAYMENT_VERIFIED',
    fulfillment_status: 'COMPLETED',
    transaction_status: 'success',
    invoice_status: 'paid',
  }, 'completed seed order should have matching payment, fulfillment, transaction, and invoice states');
  const awaitingSeed = seedStateDb.prepare(`
    SELECT o.status, o.payment_status, t.status AS transaction_status
    FROM orders o
    JOIN transactions t ON t.order_id = o.id
    WHERE o.id = 'ord_1002'
  `).get() as any;
  assert.deepEqual({ ...awaitingSeed }, {
    status: 'pending',
    payment_status: 'AWAITING_PAYMENT',
    transaction_status: 'pending',
  }, 'awaiting seed order must not show successful payment or processing status');
  seedStateDb.close();

  const unverifiedRiotId = 'QA_VerificationProbe#QAVIB';
  const riotCheck = await request('/api/riot/verify', {
    method: 'POST',
    body: JSON.stringify({ riotId: unverifiedRiotId }),
  });
  assert.equal(riotCheck.status, 400, 'an unverified Riot ID should not be presented as an existing account');
  assert.equal(riotCheck.body.exists, false);
  assert.equal(riotCheck.body.verified, false, 'format-only checks must not claim Riot verification');
  assert.match(riotCheck.body.error, /verification is unavailable/i);
  const riotDb = new DatabaseSync(dbPath);
  const fabricatedRiotCache = riotDb.prepare('SELECT id FROM riot_accounts WHERE riot_id = ? COLLATE NOCASE').get(unverifiedRiotId);
  riotDb.close();
  assert.equal(fabricatedRiotCache, undefined, 'format-only checks must not generate or persist a fake PUUID');

  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@vib.gg', password: 'AdminPassword@123' }),
  });
  assert.equal(adminLogin.status, 200, 'test database should provide a seeded admin account');
  const adminToken = adminLogin.body.token as string;
  assert.ok(adminToken, 'admin login should return a token');
  const staticAdminToken = await request('/api/admin/orders', { headers: { Authorization: 'Bearer token_admin' } });
  assert.equal(staticAdminToken.status, 401, 'hardcoded QA tokens must never authenticate requests');
  const adminUserId = adminLogin.body.user?.id as string;
  assert.ok(adminUserId, 'admin login should return the authenticated user ID');

  const adminUsers = await request('/api/admin/users', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminUsers.status, 200, 'admin CRM registry should load');
  const countDb = new DatabaseSync(dbPath, { readOnly: true });
  for (const user of adminUsers.body.users ?? []) {
    const actualOrderCount = (countDb.prepare('SELECT COUNT(*) AS count FROM orders WHERE user_id = ?').get(user.id) as any).count;
    assert.equal(user.total_orders, actualOrderCount, `CRM order count for ${user.email} must match persisted orders`);
  }
  const adminCrm = await request(`/api/admin/users/${adminUserId}/crm`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminCrm.status, 200, 'admin CRM profile should load');
  assert.equal(adminCrm.body.user.total_orders, 0, 'superadmin profile should not inherit fabricated seed order counts');
  countDb.close();

  const templateList = await request('/api/admin/communication/templates', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(templateList.status, 200, 'admin should be able to load communication templates');
  const originalTemplate = templateList.body.templates?.[0];
  assert.ok(originalTemplate?.id, 'isolated database should contain a communication template');
  const editedTemplate = await request(`/api/admin/communication/templates/${originalTemplate.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ subject: `${originalTemplate.subject} [QA]`, body: originalTemplate.body }),
  });
  assert.equal(editedTemplate.status, 200, 'admin should update a communication template');
  assert.equal(editedTemplate.body.template.subject, `${originalTemplate.subject} [QA]`, 'template update should persist');
  const invalidTemplate = await request(`/api/admin/communication/templates/${originalTemplate.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ subject: '   ' }),
  });
  assert.equal(invalidTemplate.status, 400, 'template updates should reject blank subjects');
  const restoredTemplate = await request(`/api/admin/communication/templates/${originalTemplate.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ subject: originalTemplate.subject, body: originalTemplate.body }),
  });
  assert.equal(restoredTemplate.status, 200, 'isolated test template should be restored after the update check');

  const announcementDbBefore = new DatabaseSync(dbPath, { readOnly: true });
  const notificationCountBeforeAnnouncement = (announcementDbBefore.prepare('SELECT COUNT(*) AS count FROM notifications').get() as any).count;
  announcementDbBefore.close();
  const invalidAnnouncementAudience = await request('/api/admin/announcements', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ title: 'Isolated invalid audience', message: 'Must not notify anyone.', targetGroup: 'buyerz' }),
  });
  assert.equal(invalidAnnouncementAudience.status, 400, 'unknown announcement audiences must be rejected instead of falling back to all users');
  const invalidAnnouncementText = await request('/api/admin/announcements', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ title: '  ', message: 'Message without a title', targetGroup: 'buyers' }),
  });
  assert.equal(invalidAnnouncementText.status, 400, 'blank announcement titles must be rejected');
  const oversizedAnnouncement = await request('/api/admin/announcements', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ title: 'Too long', message: 'x'.repeat(4001), targetGroup: 'buyers' }),
  });
  assert.equal(oversizedAnnouncement.status, 400, 'announcement messages must be length-bounded');
  const notificationCountAfterInvalidAnnouncement = new DatabaseSync(dbPath, { readOnly: true });
  assert.equal(
    (notificationCountAfterInvalidAnnouncement.prepare('SELECT COUNT(*) AS count FROM notifications').get() as any).count,
    notificationCountBeforeAnnouncement,
    'rejected announcement requests must not create partial notifications'
  );
  notificationCountAfterInvalidAnnouncement.close();
  for (const targetGroup of ['buyers', 'sellers', 'all']) {
    const announcementTitle = `Isolated ${targetGroup} audience ${Date.now()}`;
    const announcement = await request('/api/admin/announcements', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: announcementTitle, message: `Synthetic isolated ${targetGroup} announcement.`, targetGroup }),
    });
    assert.equal(announcement.status, 200, `valid ${targetGroup} announcements should dispatch successfully`);
    const announcementDb = new DatabaseSync(dbPath, { readOnly: true });
    const expectedUsers = targetGroup === 'all'
      ? announcementDb.prepare("SELECT id FROM users WHERE status = 'active' ORDER BY id").all() as any[]
      : announcementDb.prepare('SELECT id FROM users WHERE status = ? AND role = ? ORDER BY id').all('active', targetGroup === 'buyers' ? 'user' : 'seller') as any[];
    const actualUsers = announcementDb.prepare('SELECT user_id FROM notifications WHERE title = ? ORDER BY user_id').all(announcementTitle) as any[];
    const announcementAudit = announcementDb.prepare("SELECT target_id, details_json FROM audit_logs WHERE action = 'DISPATCH_ANNOUNCEMENT' AND target_id = ? ORDER BY created_at DESC LIMIT 1").get(targetGroup) as any;
    announcementDb.close();
    assert.equal(announcement.body.recipientCount, expectedUsers.length, `${targetGroup} announcement response should match active target users`);
    assert.deepEqual(actualUsers.map((row) => row.user_id), expectedUsers.map((row) => row.id), `${targetGroup} announcement must notify only the intended active audience`);
    assert.equal(announcementAudit?.target_id, targetGroup);
    assert.equal(JSON.parse(announcementAudit?.details_json || '{}').recipientCount, expectedUsers.length, 'announcement audit should record the actual recipient count');
  }

  const adminReadRoutes = [
    '/api/admin/stats',
    '/api/admin/users',
    '/api/admin/orders',
    '/api/admin/transactions',
    '/api/admin/invoices',
    '/api/admin/finance/overview',
    '/api/admin/finance/expenses',
    '/api/admin/finance/settlements',
    '/api/admin/tasks',
    '/api/admin/tickets',
    '/api/admin/communication/templates',
    '/api/admin/audit-logs',
    '/api/admin/vp-codes',
    '/api/admin/regional-orders',
    '/api/admin/listings',
    '/api/admin/email-logs',
    '/api/payment/settings',
    '/api/products',
    '/api/skins',
    '/api/auctions',
    '/api/vip-plans',
  ];
  const adminReads = await Promise.all(adminReadRoutes.map((route) =>
    request(route, { headers: { Authorization: `Bearer ${adminToken}` } })
  ));
  const failedAdminReads = adminReads
    .map((result, index) => ({ route: adminReadRoutes[index], status: result.status, body: result.body }))
    .filter((result) => result.status !== 200);
  assert.deepEqual(failedAdminReads, [], 'every admin module read endpoint should respond successfully');
  const financeSettlements = adminReads[adminReadRoutes.indexOf('/api/admin/finance/settlements')];
  assert.deepEqual(financeSettlements.body.settlements, [], 'finance must not expose fabricated seller settlement records');
  assert.equal(financeSettlements.body.configured, false, 'unconfigured seller settlement ledger must be reported honestly');
  const financeOverview = adminReads[adminReadRoutes.indexOf('/api/admin/finance/overview')];
  assert.equal(financeOverview.body.financeOverview?.settlementQueueCount, 0, 'finance queue count must not claim nonexistent settlements');

  const loginAudit = await request('/api/admin/audit-logs', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(loginAudit.status, 200, 'admin should be able to read the audit trail');
  const adminLoginAudit = loginAudit.body.logs?.find((log: any) => log.action === 'USER_LOGIN' && log.actor_id === adminUserId);
  assert.ok(adminLoginAudit, 'admin login should be recorded in the audit trail');
  assert.equal(adminLoginAudit.target_id, adminUserId, 'audit trail must identify the actor without storing the bearer token');
  assert.notEqual(adminLoginAudit.target_id, adminToken, 'bearer token must never appear in the audit target ID');
  const legacyAudit = loginAudit.body.logs?.find((log: any) => log.id === 'legacy-login');
  assert.equal(legacyAudit?.target_id, 'legacy-user', 'startup migration should redact existing login tokens from the audit trail');
  assert.ok(!JSON.stringify(loginAudit.body).includes(legacyLoginToken), 'audit API must not expose a legacy bearer token');

  const qaRegistration = {
    name: 'Terms Consent Regression',
    email: 'terms-consent@example.invalid',
    password: 'RegressionPassword123',
  };
  const registrationWithoutConsent = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(qaRegistration),
  });
  assert.equal(registrationWithoutConsent.status, 400, 'registration must reject missing explicit terms consent');
  const registeredWithConsent = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...qaRegistration, terms_accepted: true }),
  });
  assert.equal(registeredWithConsent.status, 201, 'registration should succeed after explicit consent');
  const duplicateRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...qaRegistration, terms_accepted: true }),
  });
  assert.equal(duplicateRegistration.status, 409, 'registration must reject duplicate email addresses');
  const registrationDb = new DatabaseSync(dbPath, { readOnly: true });
  const termsRecord = registrationDb.prepare('SELECT terms_accepted_at, terms_version FROM users WHERE email = ?').get(qaRegistration.email) as any;
  registrationDb.close();
  assert.ok(termsRecord?.terms_accepted_at, 'registration must persist the explicit consent timestamp');
  assert.equal(termsRecord?.terms_version, 'platform-escrow-v1', 'registration must persist the accepted terms version');

  const customerLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'customer@vib.gg', password: 'CustomerPassword@123' }),
  });
  assert.equal(customerLogin.status, 200, 'test database should provide a seeded customer account');
  const customerToken = customerLogin.body.token as string;
  assert.ok(customerToken, 'customer login should return a token');
  const anonymousEscrow = await request('/api/escrow/tickets', {
    method: 'POST',
    body: JSON.stringify({ tradeType: 'buy', counterparty: 'QA#TEST00', weaponOrSkin: 'Synthetic QA item', region: 'India (MUM)', amount: 100 }),
  });
  assert.equal(anonymousEscrow.status, 401, 'anonymous users must not create escrow tickets attached to another user');
  const invalidEscrow = await request('/api/escrow/tickets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ tradeType: 'gift', counterparty: 'QA#TEST00', weaponOrSkin: 'Synthetic QA item', region: 'India (MUM)', amount: -1 }),
  });
  assert.equal(invalidEscrow.status, 400, 'escrow requests must validate trade type and positive amount');
  const escrowRequest = await request('/api/escrow/tickets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ tradeType: 'buy', counterparty: 'QA#TEST00', weaponOrSkin: 'Synthetic QA item', skinVariant: 'Disposable test variant', region: 'India (MUM)', amount: '100', contactEmail: 'qa-escrow@example.invalid' }),
  });
  assert.equal(escrowRequest.status, 201, `authenticated escrow request should succeed: ${JSON.stringify(escrowRequest.body)}`);
  assert.match(escrowRequest.body.message, /staff review/i);
  const escrowDb = new DatabaseSync(dbPath, { readOnly: true });
  const escrowTicket = escrowDb.prepare('SELECT user_id, category, status, messages_json FROM support_tickets WHERE id = ?').get(escrowRequest.body.ticketId) as any;
  const escrowNotification = escrowDb.prepare('SELECT user_id, message FROM notifications WHERE title = ?').get(`Escrow request received: #${escrowRequest.body.ticketId}`) as any;
  const escrowAudit = escrowDb.prepare("SELECT actor_id, action, target_id FROM audit_logs WHERE action = 'CREATE_ESCROW_TICKET' AND target_id = ?").get(escrowRequest.body.ticketId) as any;
  escrowDb.close();
  assert.equal(escrowTicket?.user_id, customerLogin.body.user.id, 'escrow ticket must belong to the authenticated customer');
  assert.equal(escrowTicket?.category, 'trade_escrow');
  assert.equal(escrowTicket?.status, 'open');
  assert.match(escrowTicket?.messages_json || '', /waiting for staff review/i, 'ticket transcript must not claim a middleman is assigned');
  assert.equal(escrowNotification?.user_id, customerLogin.body.user.id, 'escrow notification must belong to the requester');
  assert.equal(escrowAudit?.actor_id, customerLogin.body.user.id, 'escrow audit event must identify the requester');
  assert.equal(escrowAudit?.target_id, escrowRequest.body.ticketId);
  const qaSupportTicket = await request('/api/user/tickets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ subject: 'Synthetic support reply regression', category: 'general', message: 'Synthetic initial support message.' }),
  });
  assert.equal(qaSupportTicket.status, 201, 'customer should be able to open a support ticket');
  const supportCreationDb = new DatabaseSync(dbPath, { readOnly: true });
  const supportCreationNotification = supportCreationDb.prepare("SELECT COUNT(*) AS count FROM notifications WHERE title = 'New customer support ticket' AND message LIKE ?").get(`%${qaSupportTicket.body.ticketId}%`) as any;
  const supportCreationAudit = supportCreationDb.prepare("SELECT actor_id FROM audit_logs WHERE action = 'CREATE_SUPPORT_TICKET' AND target_id = ?").get(qaSupportTicket.body.ticketId) as any;
  supportCreationDb.close();
  assert.ok(supportCreationNotification?.count > 0, 'new support tickets must notify active staff');
  assert.equal(supportCreationAudit?.actor_id, customerLogin.body.user.id, 'support ticket audit event must identify the customer');
  const anonymousTicketReply = await request(`/api/user/tickets/${qaSupportTicket.body.ticketId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message: 'Anonymous reply must not persist.' }),
  });
  assert.equal(anonymousTicketReply.status, 401, 'anonymous users must not reply to customer tickets');
  const blankTicketReply = await request(`/api/user/tickets/${qaSupportTicket.body.ticketId}/reply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ message: '   ' }),
  });
  assert.equal(blankTicketReply.status, 400, 'blank support replies must be rejected');
  const otherOwnerReply = await request(`/api/user/tickets/${qaSupportTicket.body.ticketId}/reply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ message: 'Staff must use the staff ticket workflow.' }),
  });
  assert.equal(otherOwnerReply.status, 404, 'users other than the ticket owner must not reply through the customer endpoint');
  const supportReply = await request(`/api/user/tickets/${qaSupportTicket.body.ticketId}/reply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ message: 'Synthetic customer follow-up.' }),
  });
  assert.equal(supportReply.status, 200, 'ticket owner should be able to reply while the ticket is open');
  const supportReplyDb = new DatabaseSync(dbPath, { readOnly: true });
  const supportReplyTicket = supportReplyDb.prepare('SELECT user_id, status, messages_json FROM support_tickets WHERE id = ?').get(qaSupportTicket.body.ticketId) as any;
  const supportReplyAudit = supportReplyDb.prepare("SELECT actor_id FROM audit_logs WHERE action = 'USER_REPLY_TICKET' AND target_id = ?").get(qaSupportTicket.body.ticketId) as any;
  const staffReplyNotification = supportReplyDb.prepare("SELECT COUNT(*) AS count FROM notifications WHERE title = 'New customer support reply' AND message LIKE ?").get(`%${qaSupportTicket.body.ticketId}%`) as any;
  supportReplyDb.close();
  assert.equal(supportReplyTicket?.user_id, customerLogin.body.user.id);
  assert.equal(supportReplyTicket?.status, 'open');
  assert.match(supportReplyTicket?.messages_json || '', /Synthetic customer follow-up\./);
  assert.equal(supportReplyAudit?.actor_id, customerLogin.body.user.id, 'support reply audit event must identify the customer owner');
  assert.ok(staffReplyNotification?.count > 0, 'customer reply must notify active staff accounts');
  const resolveQASupportTicket = await request(`/api/admin/tickets/${qaSupportTicket.body.ticketId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'resolved' }),
  });
  assert.equal(resolveQASupportTicket.status, 200, 'staff should be able to resolve an isolated support ticket');
  const resolvedTicketReply = await request(`/api/user/tickets/${qaSupportTicket.body.ticketId}/reply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ message: 'Reply after resolution must be rejected.' }),
  });
  assert.equal(resolvedTicketReply.status, 409, 'resolved support tickets must not accept new replies');
  const unknownCatalogOrder = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ product_id: 'fake-999', title: 'Spoofed catalog item', amount: 1, type: 'vp' }),
  });
  assert.equal(unknownCatalogOrder.status, 400, 'orders with unknown product IDs must not fall back to client-supplied prices');
  const malformedCatalogPrice = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ product_id: 'vp-475', title: '475 Valorant Points Pack', amount: 'not-a-number', type: 'vp' }),
  });
  assert.equal(malformedCatalogPrice.status, 400, 'catalog checkout must reject non-finite client amount input');
  const oversizedOrderTitle = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ title: 'x'.repeat(201), amount: 0, type: 'consultation' }),
  });
  assert.equal(oversizedOrderTitle.status, 400, 'order titles must be bounded before they reach persisted records');
  const unpricedPaidService = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ title: 'Synthetic unpriced service', amount: 1, type: 'service', paymentMethod: 'TEST_ONLY_NO_PAYMENT' }),
  });
  assert.equal(unpricedPaidService.status, 400, 'paid service orders without an active catalog product must be rejected');
  const catalogPricedService = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ title: 'Region Change: IND to PHP Migration', amount: 1299, type: 'service', paymentMethod: 'TEST_ONLY_NO_PAYMENT' }),
  });
  assert.equal(catalogPricedService.status, 201, 'a service card title should resolve to its persisted server catalog price');
  assert.equal(catalogPricedService.body.order.amount, 1299);
  assert.equal(catalogPricedService.body.order.title, 'Region Change: IND to PHP Migration');
  const rankupQuote = {
    fromRankId: 'plat_1', toRankId: 'plat_3', mode: 'duo', queueType: 'priority',
  };
  const rankupOrder = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ title: 'Client supplied rank-up title', amount: 2500, type: 'rankup', paymentMethod: 'TEST_ONLY_NO_PAYMENT', details: { rankup: rankupQuote } }),
  });
  assert.equal(rankupOrder.status, 201, `server-priced rank-up quote should be accepted: ${JSON.stringify(rankupOrder.body)}`);
  assert.equal(rankupOrder.body.order.amount, 2500, 'rank-up amount should be calculated from persisted tier rates');
  assert.equal(rankupOrder.body.order.title, 'Rankup: Platinum 1 to Platinum 3', 'rank-up title should be canonicalized by the server');
  assert.equal(rankupOrder.body.order.details.rankup.mode, 'duo');
  assert.equal(rankupOrder.body.order.details.rankup.queueType, 'priority');
  const tamperedRankupPrice = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ title: 'Rankup: Platinum 1 to Platinum 3', amount: 1, type: 'rankup', details: { rankup: rankupQuote } }),
  });
  assert.equal(tamperedRankupPrice.status, 400, 'rank-up checkout must reject a client-modified amount');
  const reversedRankup = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ title: 'Invalid rank-up', amount: 1, type: 'rankup', details: { rankup: { ...rankupQuote, fromRankId: 'plat_3', toRankId: 'plat_1' } } }),
  });
  assert.equal(reversedRankup.status, 400, 'rank-up checkout must reject a target at or below the starting rank');
  const rentalOrder = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ product_id: 'service-rent-6-30d', title: 'Client rental title', amount: 2999, type: 'rental', paymentMethod: 'TEST_ONLY_NO_PAYMENT', details: { rentalDuration: '24h' } }),
  });
  assert.equal(rentalOrder.status, 201, `catalog-backed rental should be accepted: ${JSON.stringify(rentalOrder.body)}`);
  assert.equal(rentalOrder.body.order.amount, 2999, 'rental amount should match the selected catalog SKU');
  assert.equal(rentalOrder.body.order.title, 'Rent Champions 2024 Vandal (30d)');
  assert.equal(rentalOrder.body.order.details.rentalDuration, '30d', 'stored rental duration should be taken from the selected catalog SKU');
  const rentalCatalog = await request('/api/products?category=rental');
  assert.equal(rentalCatalog.status, 200);
  assert.equal(rentalCatalog.body.products.filter((product: any) => product.details?.rentalId).length, 24, 'the six advertised rentals should each have four persisted duration SKUs');
  const tamperedRentalPrice = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ product_id: 'service-rent-6-30d', title: 'Rent Champions 2024 Vandal (30d)', amount: 249, type: 'rental' }),
  });
  assert.equal(tamperedRentalPrice.status, 400, 'rental checkout must reject prices for a different duration');
  const qaVpCode = `QAONLY-${Date.now()}`;
  const importedQaCode = await request('/api/admin/vp-codes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ package_id: 'vp-475', codes: [qaVpCode], batch_no: 'ISOLATED-REGRESSION' }),
  });
  assert.equal(importedQaCode.status, 201, 'synthetic QA-only code should be imported into the disposable vault');
  const vpProductResponse = await request('/api/products/vp-475');
  assert.equal(vpProductResponse.status, 200);
  const vpOrder = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ product_id: 'vp-475', title: 'Spoofed VP title', amount: vpProductResponse.body.product.price_inr, type: 'vp', paymentMethod: 'TEST_ONLY_NO_PAYMENT' }),
  });
  assert.equal(vpOrder.status, 201);
  const vpOrderId = vpOrder.body.order.id as string;
  const qaUtr = String(Date.now()).slice(-12);
  const vpEvidence = await request(`/api/orders/${vpOrderId}/payment-evidence`, {
    method: 'POST', headers: { Authorization: `Bearer ${customerToken}` }, body: JSON.stringify({ ref: qaUtr }),
  });
  assert.equal(vpEvidence.status, 200);
  const failureInjectionDb = new DatabaseSync(dbPath);
  failureInjectionDb.exec(`CREATE TRIGGER fail_vp_order_update BEFORE UPDATE ON orders WHEN OLD.id = '${vpOrderId}' BEGIN SELECT RAISE(ABORT, 'injected QA rollback'); END;`);
  failureInjectionDb.close();
  const failedVpApproval = await request(`/api/admin/orders/${vpOrderId}/verify-payment`, {
    method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ action: 'approve' }),
  });
  assert.equal(failedVpApproval.status, 500, 'a failure after code reservation should report a failed verification');
  const verifyRollbackDb = new DatabaseSync(dbPath);
  assert.equal((verifyRollbackDb.prepare('SELECT status FROM vp_codes WHERE code = ?').get(qaVpCode) as any)?.status, 'available', 'failed approval should roll back code reservation');
  assert.equal((verifyRollbackDb.prepare('SELECT payment_status FROM orders WHERE id = ?').get(vpOrderId) as any)?.payment_status, 'SUBMITTED_FOR_VERIFICATION', 'failed approval should preserve order payment state');
  verifyRollbackDb.exec('DROP TRIGGER fail_vp_order_update');
  verifyRollbackDb.close();
  const vpApproval = await request(`/api/admin/orders/${vpOrderId}/verify-payment`, {
    method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ action: 'approve', notes: 'Isolated QA code allocation; no payment was made.' }),
  });
  assert.equal(vpApproval.status, 200, `VP code allocation should succeed: ${JSON.stringify(vpApproval.body)}`);
  assert.equal(vpApproval.body.codeIssued, true);
  const issuedQaCode = vpApproval.body.order.issued_code as string;
  assert.ok(issuedQaCode, 'the order should receive an existing inventory code');
  const duplicateVpApproval = await request(`/api/admin/orders/${vpOrderId}/verify-payment`, {
    method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ action: 'approve' }),
  });
  assert.equal(duplicateVpApproval.status, 409, 'a paid VP order must not issue a second code on repeated approval');
  const vpVaultDb = new DatabaseSync(dbPath, { readOnly: true });
  const issuedRows = vpVaultDb.prepare("SELECT code, status, order_id FROM vp_codes WHERE order_id = ? AND status = 'issued'").all(vpOrderId) as any[];
  assert.equal(issuedRows.length, 1, 'one approval should reserve and issue exactly one code');
  assert.equal(issuedRows[0].code, issuedQaCode);
  assert.equal(issuedRows[0].status, 'issued');
  assert.equal((vpVaultDb.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND title LIKE ?').get(customerLogin.body.user.id, `%${vpOrderId}%`) as any).count, 1, 'VP payment approval should create one customer notification');
  assert.equal((vpVaultDb.prepare("SELECT COUNT(*) AS count FROM email_logs WHERE template_name = 'vp_code_delivered' AND context_json LIKE ?").get(`%${vpOrderId}%`) as any).count, 1, 'VP code delivery should be logged when SMTP is unavailable');
  if (issuedQaCode !== qaVpCode) {
    assert.equal((vpVaultDb.prepare('SELECT status FROM vp_codes WHERE code = ?').get(qaVpCode) as any)?.status, 'available', 'unselected QA code should remain untouched');
  }
  vpVaultDb.close();
  const underpricedService = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ title: 'Region Change: IND to PHP Migration', amount: 1, type: 'service', paymentMethod: 'TEST_ONLY_NO_PAYMENT' }),
  });
  assert.equal(underpricedService.status, 400, 'service cards must reject client supplied prices below the persisted price');
  const regionalIndiaOrder = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ product_id: 'vp-in-3650', title: '3,650 VP (Indian Region Top-Up)', amount: 3199, currency: 'INR', type: 'vp', paymentMethod: 'TEST_ONLY_NO_PAYMENT' }),
  });
  assert.equal(regionalIndiaOrder.status, 201, 'regional Indian VP pack should accept its persisted storefront price');
  assert.equal(regionalIndiaOrder.body.order.amount, 3199);
  const tamperedRegionalIndiaOrder = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ product_id: 'vp-in-3650', title: '3,650 VP (Indian Region Top-Up)', amount: 1, currency: 'INR', type: 'vp', paymentMethod: 'TEST_ONLY_NO_PAYMENT' }),
  });
  assert.equal(tamperedRegionalIndiaOrder.status, 400, 'regional VP pack must reject a client-supplied underprice');
  const regionalPhilippinesOrder = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ product_id: 'vp-ph-475', title: '475 VP (Philippines Region Top-Up)', amount: 299, currency: 'INR', type: 'vp', paymentMethod: 'TEST_ONLY_NO_PAYMENT' }),
  });
  assert.equal(regionalPhilippinesOrder.status, 201, 'regional Philippines VP pack should accept its persisted storefront price');
  assert.equal(regionalPhilippinesOrder.body.order.amount, 299);
  const unpaidRegionalCompletion = await request(`/api/admin/regional-orders/${regionalPhilippinesOrder.body.order.id}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'completed', regional_notes: 'Isolated test only; must not complete before payment verification.' }),
  });
  assert.equal(unpaidRegionalCompletion.status, 409, 'regional fulfillment must not be marked complete before payment verification');
  const regionalQueue = await request('/api/admin/regional-orders', { headers: { Authorization: `Bearer ${adminToken}` } });
  assert.ok(regionalQueue.body.orders?.some((order: any) => order.id === regionalPhilippinesOrder.body.order.id), 'regional queue should include the Philippines VP order');
  assert.ok(!regionalQueue.body.orders?.some((order: any) => order.id === catalogPricedService.body.order.id), 'regional queue must exclude unrelated IND to PHP service orders');
  const regionalUtr = String((BigInt(Date.now()) + 1n) % 1_000_000_000_000n).padStart(12, '0');
  const regionalEvidence = await request(`/api/orders/${regionalPhilippinesOrder.body.order.id}/payment-evidence`, {
    method: 'POST', headers: { Authorization: `Bearer ${customerToken}` }, body: JSON.stringify({ ref: regionalUtr }),
  });
  assert.equal(regionalEvidence.status, 200);
  const regionalApproval = await request(`/api/admin/orders/${regionalPhilippinesOrder.body.order.id}/verify-payment`, {
    method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ action: 'approve', notes: 'Isolated regional payment test; no payment was made.' }),
  });
  assert.equal(regionalApproval.status, 200);
  const invalidRegionalStatus = await request(`/api/admin/regional-orders/${regionalPhilippinesOrder.body.order.id}/status`, {
    method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ fulfillment_status: 'bogus' }),
  });
  assert.equal(invalidRegionalStatus.status, 400, 'regional fulfillment should reject unknown states');
  const missingRegionalCompletionNote = await request(`/api/admin/regional-orders/${regionalPhilippinesOrder.body.order.id}/status`, {
    method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ fulfillment_status: 'COMPLETED' }),
  });
  assert.equal(missingRegionalCompletionNote.status, 400, 'regional completion must require an operations note');
  const regionalCompletion = await request(`/api/admin/regional-orders/${regionalPhilippinesOrder.body.order.id}/status`, {
    method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ fulfillment_status: 'COMPLETED', notes: 'QA top-up completed in disposable database.' }),
  });
  assert.equal(regionalCompletion.status, 200);
  assert.equal(regionalCompletion.body.order.status, 'completed');
  assert.equal(regionalCompletion.body.order.fulfillment_status, 'COMPLETED');
  const completedRegionalQueue = await request('/api/admin/regional-orders?status=completed', { headers: { Authorization: `Bearer ${adminToken}` } });
  assert.ok(completedRegionalQueue.body.orders?.some((order: any) => order.id === regionalPhilippinesOrder.body.order.id), 'completed filter should return the completed regional order');
  const reopenedRegionalOrder = await request(`/api/admin/regional-orders/${regionalPhilippinesOrder.body.order.id}/status`, {
    method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ fulfillment_status: 'PROCESSING', notes: 'Must not reopen.' }),
  });
  assert.equal(reopenedRegionalOrder.status, 409, 'completed regional orders must not be reopened');
  const underpricedCatalogOrder = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ product_id: 'vp-475', title: '475 Valorant Points Pack', amount: 1, type: 'vp' }),
  });
  assert.equal(underpricedCatalogOrder.status, 400, 'known catalog products must reject client-supplied price changes');
  const verifiedCartOrder = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      title: 'Cart Checkout: client supplied text',
      type: 'cart',
      amount: 998,
      details: { cartItems: [{ id: 'vp-475', quantity: 2 }] },
    }),
  });
  assert.equal(verifiedCartOrder.status, 201, `server-priced cart should be accepted: ${JSON.stringify(verifiedCartOrder.body)}`);
  assert.equal(verifiedCartOrder.body.order.amount, 998, 'cart total should be calculated from persisted catalog prices');
  assert.match(verifiedCartOrder.body.order.title, /475 Valorant Points Pack \(x2\)/, 'cart title should use server catalog text');
  const underpricedCartOrder = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ title: 'Cart Checkout: discount bypass', type: 'cart', amount: 1, details: { cartItems: [{ id: 'vp-475', quantity: 2 }] } }),
  });
  assert.equal(underpricedCartOrder.status, 400, 'cart totals below server-computed amount must be rejected');

  const profileUpdate = await request('/api/user/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      name: customerLogin.body.user.name,
      phone: customerLogin.body.user.phone,
      riot_id: customerLogin.body.user.riot_id,
      discord_tag: 'AlexM#1234',
      bio: 'Isolated profile update regression.',
    }),
  });
  assert.equal(profileUpdate.status, 200, 'profile edits must not reverify an unchanged Riot ID');
  assert.equal(profileUpdate.body.user.bio, 'Isolated profile update regression.');
  assert.equal(profileUpdate.body.user.riot_id, customerLogin.body.user.riot_id);
  const invalidRiotProfileUpdate = await request('/api/user/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ name: customerLogin.body.user.name, phone: customerLogin.body.user.phone, riot_id: 'Invalid#Riot', bio: 'Should not be saved.' }),
  });
  assert.equal(invalidRiotProfileUpdate.status, 400, 'changed Riot IDs must still require authoritative verification');
  const profileAfterRejectedRiot = await request('/api/auth/me', { headers: { Authorization: `Bearer ${customerToken}` } });
  assert.equal(profileAfterRejectedRiot.status, 200);
  assert.equal(profileAfterRejectedRiot.body.user.bio, 'Isolated profile update regression.', 'rejected Riot changes must not partially update the profile');

  const forbiddenAdminCalls = await Promise.all([
    request('/api/admin/orders', { headers: { Authorization: `Bearer ${customerToken}` } }),
    request('/api/admin/users', { headers: { Authorization: `Bearer ${customerToken}` } }),
    request('/api/admin/users/usr_nonexistent/role', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ role: 'admin' }),
    }),
  ]);
  assert.deepEqual(forbiddenAdminCalls.map((result) => result.status), [403, 403, 403], 'customers must not read staff data or change roles');

  const moderatorLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'moderator@vib.gg', password: 'Moderator@123' }),
  });
  assert.equal(moderatorLogin.status, 200, 'isolated database should provide a staff moderator account');
  const moderatorToken = moderatorLogin.body.token as string;
  const moderatorStats = await request('/api/admin/stats', { headers: { Authorization: `Bearer ${moderatorToken}` } });
  assert.equal(moderatorStats.status, 200, 'moderators should see staff-safe aggregate statistics');
  assert.equal(Object.prototype.hasOwnProperty.call(moderatorStats.body.metrics || {}, 'grossRevenue'), false, 'moderator stats must not disclose financial totals');
  const moderatorRoleChecks = await Promise.all([
    request('/api/admin/orders', { headers: { Authorization: `Bearer ${moderatorToken}` } }),
    request('/api/admin/users', { headers: { Authorization: `Bearer ${moderatorToken}` } }),
    request('/api/admin/communication/templates', { headers: { Authorization: `Bearer ${moderatorToken}` } }),
  ]);
  assert.deepEqual(moderatorRoleChecks.map((result) => result.status), [200, 403, 403], 'moderators should access staff operations without CRM or communication privileges');

  const featuredAuction = await request('/api/auctions/lot_0881');
  assert.equal(featuredAuction.status, 200);
  const persistedAuctionBidCount = new DatabaseSync(dbPath, { readOnly: true });
  const actualAuctionBidCount = (persistedAuctionBidCount.prepare("SELECT COUNT(*) AS count FROM auction_bids WHERE lot_id = 'lot_0881'").get() as any).count;
  persistedAuctionBidCount.close();
  assert.equal(featuredAuction.body.lot.bid_count, actualAuctionBidCount, 'auction displayed bid count must match persisted bid rows');

  const anonymousBid = await request('/api/auctions/lot_0881/bid', {
    method: 'POST',
    body: JSON.stringify({ amount: 5000, bidder_name: 'Forged Verified Bidder' }),
  });
  assert.equal(anonymousBid.status, 401, 'anonymous users must not place auction bids');
  const belowMinimumBid = await request('/api/auctions/lot_0881/bid', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ amount: 4900, bidder_name: 'Forged Customer Name' }),
  });
  assert.equal(belowMinimumBid.status, 400, 'auction should reject bids below current bid plus minimum increment');
  const localBid = await request('/api/auctions/lot_0881/bid', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ amount: 5000, bidder_name: 'Forged Customer Name' }),
  });
  assert.equal(localBid.status, 200, 'authenticated above-minimum test bid should persist in the disposable DB');
  assert.equal(localBid.body.bid.user_id, customerLogin.body.user.id, 'bid must be attributed to the authenticated customer');
  assert.equal(localBid.body.bid.bidder_name, customerLogin.body.user.name, 'bidder display name must come from the authenticated account');

  const auctionTestDb = new DatabaseSync(dbPath);
  auctionTestDb.prepare("UPDATE auction_lots SET ends_at = ?, status = 'active' WHERE id = 'lot_0881'")
    .run(new Date(Date.now() - 1000).toISOString());
  auctionTestDb.close();
  const expiredBid = await request('/api/auctions/lot_0881/bid', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ amount: 5150 }),
  });
  assert.equal(expiredBid.status, 400, 'expired auction lots must reject bids even if stale data still says active');
  const expiredLotDb = new DatabaseSync(dbPath, { readOnly: true });
  const expiredLotStatus = expiredLotDb.prepare("SELECT status FROM auction_lots WHERE id = 'lot_0881'").get() as any;
  assert.equal(expiredLotStatus.status, 'ended', 'expired lots should be marked ended after rejected bidding');
  expiredLotDb.close();

  const testRunId = `order-flow-${Date.now()}`;
  const created = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      product_id: 'service-region-migration',
      title: `Isolated ${testRunId}`,
      amount: 1299,
      currency: 'INR',
      type: 'regression_test',
      paymentMethod: 'TEST_ONLY_NO_PAYMENT',
      details: { testRunId },
    }),
  });
  assert.equal(created.status, 201, `test order should be created: ${JSON.stringify(created.body)}`);
  const orderId = created.body.order?.id as string;
  assert.ok(orderId, 'order creation should return the persisted order id');

  const prematureApproval = await request(`/api/admin/orders/${orderId}/verify-payment`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ action: 'approve', notes: 'Must be rejected before any evidence is submitted.' }),
  });
  assert.equal(prematureApproval.status, 409, 'staff must not approve an order before payment evidence is submitted');
  const prematureCompletion = await request(`/api/admin/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'completed' }),
  });
  assert.equal(prematureCompletion.status, 409, 'staff must not complete an order before payment is verified');
  const stillUnpaid = await request('/api/user/orders', { headers: { Authorization: `Bearer ${customerToken}` } });
  assert.equal(stillUnpaid.body.orders?.find((order: any) => order.id === orderId)?.payment_status, 'AWAITING_PAYMENT');

  const invalidEvidence = await request(`/api/orders/${orderId}/payment-evidence`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ ref: `BAD-${testRunId}` }),
  });
  assert.equal(invalidEvidence.status, 400, 'payment evidence must reject non-12-digit references');
  const testUtr = String(Date.now()).slice(-12);
  const evidence = await request(`/api/orders/${orderId}/payment-evidence`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ ref: testUtr }),
  });
  assert.equal(evidence.status, 200, 'isolated test payment evidence should be accepted for staff review');

  const [customerOrders, adminOrders, transactions, invoices, metrics] = await Promise.all([
    request('/api/user/orders', { headers: { Authorization: `Bearer ${customerToken}` } }),
    request('/api/admin/orders', { headers: { Authorization: `Bearer ${adminToken}` } }),
    request('/api/admin/transactions', { headers: { Authorization: `Bearer ${adminToken}` } }),
    request('/api/admin/invoices', { headers: { Authorization: `Bearer ${adminToken}` } }),
    request('/api/admin/stats', { headers: { Authorization: `Bearer ${adminToken}` } }),
  ]);

  assert.ok(customerOrders.body.orders?.some((order: any) => order.id === orderId), 'customer history should return the created order');
  const adminOrder = adminOrders.body.orders?.find((order: any) => order.id === orderId);
  assert.ok(adminOrder, 'main admin order list should return the created order');
  assert.equal(adminOrder.payment_status, 'SUBMITTED_FOR_VERIFICATION');
  assert.equal(transactions.body.transactions?.find((transaction: any) => transaction.order_id === orderId)?.status, 'pending');
  assert.equal(invoices.body.invoices?.find((invoice: any) => invoice.order_id === orderId)?.status, 'pending');
  assert.equal(metrics.body.metrics?.pendingVerifications, 1, 'submitted evidence metric should use the app payment state');

  const contactBeforeVerification = await request(`/api/orders/${orderId}/delivery-contact`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ phone: '+91 98765 43210', email: 'dispatch@example.invalid' }),
  });
  assert.equal(contactBeforeVerification.status, 409, 'delivery contact must not be accepted before payment verification');

  const approval = await request(`/api/admin/orders/${orderId}/verify-payment`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ action: 'approve', notes: 'Isolated regression test only; no payment was made.' }),
  });
  assert.equal(approval.status, 200, `isolated staff verification should succeed: ${JSON.stringify(approval.body)}`);
  assert.equal(approval.body.order.payment_status, 'PAYMENT_VERIFIED');

  const [verifiedOrders, verifiedTransactions, verifiedInvoices] = await Promise.all([
    request('/api/admin/orders', { headers: { Authorization: `Bearer ${adminToken}` } }),
    request('/api/admin/transactions', { headers: { Authorization: `Bearer ${adminToken}` } }),
    request('/api/admin/invoices', { headers: { Authorization: `Bearer ${adminToken}` } }),
  ]);
  assert.equal(verifiedOrders.body.orders?.find((order: any) => order.id === orderId)?.payment_status, 'PAYMENT_VERIFIED');
  assert.equal(verifiedTransactions.body.transactions?.find((transaction: any) => transaction.order_id === orderId)?.status, 'success');
  assert.equal(verifiedInvoices.body.invoices?.find((invoice: any) => invoice.order_id === orderId)?.status, 'paid');

  const invalidContact = await request(`/api/orders/${orderId}/delivery-contact`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ phone: '123', email: 'not-an-email' }),
  });
  assert.equal(invalidContact.status, 400, `delivery contact must validate provided phone and email: ${JSON.stringify(invalidContact.body)}`);
  const savedContact = await request(`/api/orders/${orderId}/delivery-contact`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ phone: '+91 98765 43210', email: 'dispatch@example.invalid', notes: 'Isolated QA only' }),
  });
  assert.equal(savedContact.status, 200, 'verified active order should accept valid delivery contact');
  const contactDetails = JSON.parse(savedContact.body.order.details_json);
  assert.equal(contactDetails.contactPhone, '+91 98765 43210');
  assert.equal(contactDetails.email, 'dispatch@example.invalid');
  const contactTimelineText = String(savedContact.body.order.timeline_json || '');
  const contactDb = new DatabaseSync(dbPath, { readOnly: true });
  const contactMessage = contactDb.prepare('SELECT message FROM order_messages WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(orderId) as any;
  contactDb.close();
  assert.ok(!contactTimelineText.includes('+91 98765 43210'), 'delivery contact should not be copied into the order timeline');
  assert.ok(!String(contactMessage?.message || '').includes('+91 98765 43210'), 'delivery contact should not be copied into order-room messages');
  const completedContact = await request('/api/orders/ord_1001/delivery-contact', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ phone: '+91 98765 43210', email: 'dispatch@example.invalid' }),
  });
  assert.equal(completedContact.status, 409, 'completed orders must reject delivery contact changes');

  const duplicateAfterApproval = await request(`/api/orders/${orderId}/payment-evidence`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ ref: String((BigInt(testUtr) + 1n) % 1_000_000_000_000n).padStart(12, '0') }),
  });
  assert.equal(duplicateAfterApproval.status, 409, 'verified orders must not accept replacement payment evidence');

  const rejectedOrder = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ product_id: 'service-region-migration', title: `Isolated rejection ${testRunId}`, amount: 1299, currency: 'INR', type: 'regression_test', paymentMethod: 'TEST_ONLY_NO_PAYMENT', details: { testRunId } }),
  });
  assert.equal(rejectedOrder.status, 201);
  const rejectedOrderId = rejectedOrder.body.order?.id as string;
  const duplicateUtr = await request(`/api/orders/${rejectedOrderId}/payment-evidence`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ ref: testUtr }),
  });
  assert.equal(duplicateUtr.status, 409, 'a UTR already used on another order must be rejected');
  const secondUtr = String((BigInt(testUtr) + 1n) % 1_000_000_000_000n).padStart(12, '0');
  const rejectedEvidence = await request(`/api/orders/${rejectedOrderId}/payment-evidence`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ ref: secondUtr }),
  });
  assert.equal(rejectedEvidence.status, 200);
  const rejection = await request(`/api/admin/orders/${rejectedOrderId}/verify-payment`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ action: 'reject', reason: 'Isolated regression test only; no payment was made.' }),
  });
  assert.equal(rejection.status, 200);
  assert.equal(rejection.body.order.payment_status, 'PAYMENT_REJECTED');
  const rejectedDb = new DatabaseSync(dbPath, { readOnly: true });
  assert.equal((rejectedDb.prepare('SELECT status FROM transactions WHERE order_id = ?').get(rejectedOrderId) as any)?.status, 'cancelled');
  assert.equal((rejectedDb.prepare('SELECT status FROM invoices WHERE order_id = ?').get(rejectedOrderId) as any)?.status, 'cancelled');
  assert.equal((rejectedDb.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND title LIKE ?').get(customerLogin.body.user.id, `%${rejectedOrderId}%`) as any).count, 1);
  rejectedDb.close();

  console.log('PASS: customer order is persisted and visible in the admin order feed');
  console.log('PASS: escrow requests require authentication and persist linked ticket, notification, and audit records');
  console.log('PASS: customer support tickets and replies persist ownership, staff notifications, and audit events');
  console.log('PASS: unknown and underpriced catalog orders are rejected');
  console.log('PASS: rank-up orders use persisted tier rates and reject tampered quotes and invalid rank progressions');
  console.log('PASS: rental orders are bound to a persisted SKU and server-recorded duration');
  console.log('PASS: fresh databases never seed fabricated VP PIN inventory');
  console.log('PASS: VP payment approval atomically issues one vault code, rolls back failures, and rejects duplicate delivery');
  console.log('PASS: regional top-ups require verified payment, use canonical status updates, and notify/audit fulfillment');
  console.log('PASS: cart orders use server catalog prices and reject modified totals');
  console.log('PASS: order transaction and invoice remain pending until staff verification');
  console.log('PASS: staff cannot approve without submitted UTR evidence or complete an unpaid order');
  console.log('PASS: admin payment verification metric reports the app pending state');
  console.log('PASS: isolated staff approval updates order, transaction, and invoice records');
  console.log('PASS: delivery contact requires verified active fulfillment, validates data, and avoids PII audit copies');
  console.log('PASS: payment evidence validates UTRs, rejects duplicates and paid-order changes, and staff rejection synchronizes related records');
  console.log('PASS: login audit records the user ID and never exposes the bearer token');
  console.log('PASS: startup migration redacts legacy login tokens while preserving audit events');
  console.log('PASS: registration requires explicit terms consent and records timestamp/version');
  console.log('PASS: password recovery never exposes a reset code and reports unavailable email delivery honestly');
  console.log('PASS: Riot ID syntax alone is never treated as account verification or cached as a fake PUUID');
  console.log('PASS: customer credentials are denied admin order, CRM, and role-change APIs');
  console.log('PASS: hardcoded QA tokens cannot authenticate as admin or staff');
  console.log('PASS: profile saves preserve unchanged Riot verification and reject invalid changed IDs without partial updates');
  console.log('PASS: moderator can read staff orders and safe metrics but is denied CRM, communication, and financial totals');
  console.log('PASS: finance returns no fabricated settlements and reports the ledger as unconfigured');
  console.log('PASS: admin CRM order counts match persisted order records');
  console.log('PASS: admin communication templates persist and announcements validate all audience groups atomically');
  console.log('PASS: auction bids enforce authentication, minimums, account identity, and expiration');
  console.log(`PASS: ${adminReadRoutes.length} admin and catalog read routes return successfully`);
} finally {
  if (server && server.exitCode === null) {
    const exited = new Promise<void>((resolve) => server!.once('exit', () => resolve()));
    server.kill();
    const stopped = await Promise.race([
      exited.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5_000)),
    ]);
    if (!stopped) {
      server.kill('SIGKILL');
      await exited;
    }
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rm(tempDir, { recursive: true, force: true });
      break;
    } catch (error: any) {
      if (!['EBUSY', 'EPERM'].includes(error?.code) || attempt === 7) {
        console.warn(`Could not remove isolated test directory ${tempDir}: ${error?.message || error}`);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}
