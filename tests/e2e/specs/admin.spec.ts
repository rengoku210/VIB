/**
 * Admin console — key panels & create/view/edit/persist regression (UI + API).
 *
 * Covers:
 *   1. GET /api/admin/stats -> 200 with metrics.
 *   2. UI: admin page renders sidebar; Orders table rows; Users & CRM lists
 *      qa_customer; reload keeps data (persistence).
 *   3. Manual invoice via API -> 201 and persists in GET /api/admin/invoices.
 *   4. Expense via API -> 201 and persists in GET /api/admin/finance/expenses.
 *   5. Staff member via API (superadmin) -> 201; listed; permissions PUT -> 200.
 *   6. Announcement broadcast -> 200; appears in customer notifications.
 *   7. Staff task -> 201; listed.
 *   8. Payment verification flow: customer order -> evidence -> admin verify ->
 *      PAYMENT_VERIFIED, invoice paid, transaction success; payment settings PUT.
 */
import { test, expect } from '@playwright/test';
import { api, login, injectAuth, QA } from '../helpers/api';
import fs from 'node:fs';
import path from 'node:path';

const ASSET_PATH = path.resolve(process.cwd(), 'tests', 'e2e', 'assets', '1x1.png');
const UI = 'http://localhost:3000';

function pngDataUrl(): string {
  return `data:image/png;base64,${fs.readFileSync(ASSET_PATH).toString('base64')}`;
}

/** Login with retries: under parallel workers the dev server can transiently 500 on SQLite contention. */
async function loginRobust(request: import('@playwright/test').APIRequestContext, email: string, password: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await login(request, email, password);
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

/** Dismiss the fixed cookie-consent banner if it intercepts clicks (z-index conflict). */
async function dismissCookieBanner(page: import('@playwright/test').Page) {
  const bannerBtn = page.getByRole('button', { name: /Essential Only|Accept All Cookies/i }).first();
  if (await bannerBtn.isVisible().catch(() => false)) {
    await bannerBtn.click();
  }
}

test.describe.configure({ mode: 'serial' });

let adminToken = '';
let customerToken = '';
const stamp = Date.now();

test.beforeAll(async ({ request }) => {
  adminToken = await loginRobust(request, QA.admin.email, QA.admin.password);
  customerToken = await loginRobust(request, QA.customer.email, QA.customer.password);
});

test('1. GET /api/admin/stats returns 200 with metrics', async ({ request }) => {
  const r = await api(request, 'GET', '/api/admin/stats', undefined, adminToken);
  expect(r.status).toBe(200);
  const d = r.data as any;
  const metrics = d.metrics || d;
  expect(typeof metrics.totalUsers).toBe('number');
  expect(typeof metrics.totalOrders).toBe('number');
  expect(typeof metrics.pendingVerifications).toBe('number');
});

test('2. admin UI: sidebar renders, Orders table shows rows, Users & CRM lists qa_customer', async ({ page, request }) => {
  // Capture a known order id to assert against the table.
  const orders = await api(request, 'GET', '/api/admin/orders', undefined, adminToken);
  expect(orders.status).toBe(200);
  const knownOrderId = (orders.data as any).orders[0].id as string;

  await injectAuth(page, adminToken);
  await page.goto(`${UI}/?page=admin`);
  await dismissCookieBanner(page);

  await expect(page.getByText('VIB Platform Admin Console')).toBeVisible();
  const ordersNav = page.getByRole('button', { name: /^Orders(\s\d+)?$/ });
  const usersNav = page.getByRole('button', { name: /^Users & CRM(\s\d+)?$/ });
  await expect(ordersNav).toBeVisible();
  await expect(usersNav).toBeVisible();

  // Orders panel.
  await ordersNav.click();
  await expect(page.getByText('Order Fulfillment & Payment Desk')).toBeVisible();
  await expect(page.getByText(`#${knownOrderId}`)).toBeVisible();

  // Users & CRM panel lists the QA customer.
  await page.getByRole('button', { name: /^Users & CRM(\s\d+)?$/ }).click();
  await expect(page.getByText('User Registry & CRM Inspection')).toBeVisible();
  await expect(page.getByText('qa_customer@vib.test')).toBeVisible();
});

test('3. persistence across refresh: admin page reload keeps orders/users data', async ({ page }) => {
  await injectAuth(page, adminToken);
  await page.goto(`${UI}/?page=admin&tab=users`);
  await dismissCookieBanner(page);
  await expect(page.getByText('qa_customer@vib.test')).toBeVisible();

  await page.reload();
  await expect(page.getByText('qa_customer@vib.test')).toBeVisible();

  await page.getByRole('button', { name: /^Orders(\s\d+)?$/ }).click();
  await expect(page.getByText('Order Fulfillment & Payment Desk')).toBeVisible();
  const rowsAfterReload = await page.locator('table tbody tr').count();
  expect(rowsAfterReload).toBeGreaterThan(0);
});

test('4. manual invoice created via API persists in invoice list', async ({ request }) => {
  const body = {
    customerName: 'QA Invoice Customer',
    customerEmail: `qa_invoice_${stamp}@vib.test`,
    productName: 'E2E Invoice Product',
    quantity: 2,
    unitPrice: 2500,
    taxPercent: 18,
    paymentMethod: 'Manual UPI / Bank Transfer',
    notes: 'Created by admin.spec.ts',
  };
  const created = await api(request, 'POST', '/api/admin/invoices', body, adminToken);
  expect(created.status).toBe(201);
  const invoiceId = (created.data as any).invoiceId as string;
  expect(invoiceId).toBeTruthy();

  const list = await api(request, 'GET', '/api/admin/invoices', undefined, adminToken);
  expect(list.status).toBe(200);
  const found = ((list.data as any).invoices as any[]).find((i: any) => i.id === invoiceId);
  expect(found).toBeTruthy();
  expect(found.customer_email).toBe(body.customerEmail);
  expect(found.product_name).toBe('E2E Invoice Product');
  expect(found.status).toBe('paid');
});

test('5. expense recorded via API persists in expense list', async ({ request }) => {
  const created = await api(request, 'POST', '/api/admin/finance/expenses', {
    category: 'server_hosting',
    description: `E2E regression expense ${stamp}`,
    amount: 450,
    paymentMethod: 'Corporate Card',
  }, adminToken);
  expect(created.status).toBe(201);
  const expenseId = (created.data as any).expenseId as string;
  expect(expenseId).toBeTruthy();

  const list = await api(request, 'GET', '/api/admin/finance/expenses', undefined, adminToken);
  expect(list.status).toBe(200);
  const found = ((list.data as any).expenses as any[]).find((e: any) => e.id === expenseId);
  expect(found).toBeTruthy();
  expect(found.description).toContain('E2E regression expense');
  expect(Number(found.amount)).toBe(450);
});

test('6. staff member created (superadmin), listed, permissions persist', async ({ request }) => {
  const email = `qa_staff_${stamp}@vib.test`;
  const created = await api(request, 'POST', '/api/admin/staff', {
    name: 'QA Staff E2E',
    email,
    password: 'QaPass#123',
    role: 'moderator',
    permissions: ['orders', 'tasks'],
  }, adminToken);
  expect(created.status).toBe(201);
  const staffId = (created.data as any).staff.id as string;

  const list = await api(request, 'GET', '/api/admin/staff', undefined, adminToken);
  expect(list.status).toBe(200);
  const staffList = (list.data as any).staff as any[];
  const found = staffList.find((s: any) => s.id === staffId);
  expect(found).toBeTruthy();
  expect(found.email).toBe(email);
  expect(found.permissions).toEqual(['orders', 'tasks']);

  const update = await api(request, 'PUT', `/api/admin/staff/${staffId}/permissions`, { permissions: [] }, adminToken);
  expect(update.status).toBe(200);

  const list2 = await api(request, 'GET', '/api/admin/staff', undefined, adminToken);
  const found2 = ((list2.data as any).staff as any[]).find((s: any) => s.id === staffId);
  expect(found2).toBeTruthy();
  expect(found2.permissions).toEqual([]);
});

test('7. announcement broadcast reaches customer notifications', async ({ request }) => {
  const title = `E2E Announcement ${stamp}`;
  const broadcast = await api(request, 'POST', '/api/admin/announcements', {
    title,
    message: 'Automated regression announcement body.',
  }, adminToken);
  expect(broadcast.status).toBe(200);
  expect((broadcast.data as any).recipientCount).toBeGreaterThan(0);

  const notifs = await api(request, 'GET', '/api/user/notifications', undefined, customerToken);
  expect(notifs.status).toBe(200);
  const found = ((notifs.data as any).notifications as any[]).some((n: any) => n.title === title);
  expect(found).toBe(true);
});

test('8. staff task created via API persists in task list', async ({ request }) => {
  const created = await api(request, 'POST', '/api/admin/tasks', {
    title: `E2E Task ${stamp}`,
    description: 'Regression coverage task',
    department: 'support',
    priority: 'high',
  }, adminToken);
  expect(created.status).toBe(201);
  const taskId = (created.data as any).taskId as string;

  const list = await api(request, 'GET', '/api/admin/tasks', undefined, adminToken);
  expect(list.status).toBe(200);
  const found = ((list.data as any).tasks as any[]).find((t: any) => t.id === taskId);
  expect(found).toBeTruthy();
  expect(found.title).toBe(`E2E Task ${stamp}`);
  expect(found.status).toBe('pending');
});

test('9. payment verification flow + payment settings update', async ({ request }) => {
  // Pick a non-VP catalog product so payment evidence keeps order awaiting admin review.
  const products = await api(request, 'GET', '/api/products');
  expect(products.status).toBe(200);
  const catalog = (products.data as any).products as any[];
  const product = catalog.find((p: any) => p.category !== 'vp' && !String(p.title).toLowerCase().includes('vp'));
  expect(product).toBeTruthy();

  // Customer creates an order backed by the catalog product.
  const order = await api(request, 'POST', '/api/user/orders', {
    product_id: product.id,
    title: product.title,
    amount: product.price_inr,
    type: product.category,
  }, customerToken);
  expect(order.status).toBe(201);
  const orderId = (order.data as any).orderId as string;

  // Unique 12-digit UTR per run (the API rejects duplicate UTRs across orders).
  const utr = String(100000000000 + (stamp % 900000000000));

  // Customer submits payment evidence.
  const evidence = await api(request, 'POST', `/api/orders/${orderId}/payment-evidence`, {
    ref: utr,
    screenshot: pngDataUrl(),
    phone: '+919999999999',
  }, customerToken);
  expect(evidence.status).toBe(200);

  const beforeVerify = await api(request, 'GET', '/api/admin/orders', undefined, adminToken);
  const ordBefore = ((beforeVerify.data as any).orders as any[]).find((o: any) => o.id === orderId);
  expect(ordBefore.payment_status).toBe('SUBMITTED_FOR_VERIFICATION');

  // Admin verifies the payment.
  const verify = await api(request, 'PUT', `/api/admin/orders/${orderId}/verify-payment`, {
    action: 'approve',
    notes: 'E2E auto-verify',
  }, adminToken);
  expect(verify.status).toBe(200);

  const afterVerify = await api(request, 'GET', '/api/admin/orders', undefined, adminToken);
  const ordAfter = ((afterVerify.data as any).orders as any[]).find((o: any) => o.id === orderId);
  expect(ordAfter.payment_status).toBe('PAYMENT_VERIFIED');

  // Invoice marked paid, transaction success.
  const invoices = await api(request, 'GET', '/api/admin/invoices', undefined, adminToken);
  const inv = ((invoices.data as any).invoices as any[]).find((i: any) => i.order_id === orderId);
  expect(inv).toBeTruthy();
  expect(inv.status).toBe('paid');

  const txns = await api(request, 'GET', '/api/admin/transactions', undefined, adminToken);
  const txn = ((txns.data as any).transactions as any[]).find((t: any) => t.order_id === orderId);
  expect(txn).toBeTruthy();
  expect(txn.status).toBe('success');

  // Payment settings update (read current, update, verify, restore).
  const before = await api(request, 'GET', '/api/payment/settings');
  expect(before.status).toBe(200);
  const originalUpi = (before.data as any).upi_id;

  const updated = await api(request, 'PUT', '/api/admin/payment/settings', {
    upi_id: 'e2e-upi@okhdfcbank',
    instructions: 'Updated by E2E regression',
  }, adminToken);
  expect(updated.status).toBe(200);

  const after = await api(request, 'GET', '/api/payment/settings');
  expect((after.data as any).upi_id).toBe('e2e-upi@okhdfcbank');

  // Restore original settings to keep the rest of the suite unaffected.
  const restored = await api(request, 'PUT', '/api/admin/payment/settings', { upi_id: originalUpi }, adminToken);
  expect(restored.status).toBe(200);
});
