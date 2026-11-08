/**
 * EMI Financing — full lifecycle regression (UI + API).
 *
 * Covers:
 *   1. API apply -> 201, emiAmount 833.33, status pending_approval.
 *   2. Customer UI: plan listed with pending approval.
 *   3. Admin UI approve -> active; installment schedule rows appear, first due
 *      next month.
 *   4. Customer UI pay first installment (UTR + evidence) -> pending verification.
 *   5. In-order rule: installment #2 cannot be paid while #1 is pending.
 *   6. Admin UI verify installment #1 -> paid; progress 1/12.
 *   7. Outstanding balance after payment ~9166.67 (±0.5).
 *   8. Overdue shape: approved app for customer2; confirm payments expose a
 *      status field and record whether 'late' ever appears (no DB tweaks).
 *
 * TEST ISOLATION: EMI rows for the two QA customers are removed up front via
 * the local SQLite DB so the suite is repeatable without app changes.
 */
import { test, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { api, login, injectAuth, QA } from '../helpers/api';

const ASSET_PATH = path.resolve(process.cwd(), 'tests', 'e2e', 'assets', '1x1.png');
const DB_PATH = path.resolve(process.cwd(), 'data', 'vib.db');
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

function resetEmiState() {
  try {
    const db = new DatabaseSync(DB_PATH);
    for (const email of [QA.customer.email, QA.customer2.email]) {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
      if (!user) continue;
      const apps = db.prepare('SELECT id FROM emi_applications WHERE user_id = ?').all(user.id) as { id: string }[];
      for (const app of apps) {
        db.prepare('DELETE FROM emi_payments WHERE application_id = ?').run(app.id);
      }
      db.prepare('DELETE FROM emi_applications WHERE user_id = ?').run(user.id);
    }
    db.close();
  } catch {
    // best-effort
  }
}

function isNextMonthIso(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  const expectedMonth = (now.getUTCMonth() + 1) % 12;
  const expectedYear = now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return d.getUTCMonth() === expectedMonth && d.getUTCFullYear() === expectedYear && d.getTime() > now.getTime() - 60_000;
}

test.describe.configure({ mode: 'serial' });

let customerToken = '';
let customer2Token = '';
let adminToken = '';
let appId = '';
let payment1Id = '';
let payment2Id = '';

test.beforeAll(async ({ request }) => {
  resetEmiState();
  customerToken = await loginRobust(request, QA.customer.email, QA.customer.password);
  customer2Token = await loginRobust(request, QA.customer2.email, QA.customer2.password);
  adminToken = await loginRobust(request, QA.admin.email, QA.admin.password);
});

test('1. API apply returns 201 with emiAmount 833.33 and pending_approval', async ({ request }) => {
  const r = await api(request, 'POST', '/api/emi/apply', {
    productTitle: 'QA EMI Pack',
    totalAmount: 12000,
    initialPayment: 2000,
    tenureMonths: 12,
  }, customerToken);
  expect(r.status).toBe(201);
  const app = (r.data as any).application;
  expect(app.id).toBeTruthy();
  expect(app.status).toBe('pending_approval');
  expect(app.emiAmount).toBeCloseTo(833.33, 2);
  expect(app.totalInstallments).toBe(12);
  appId = app.id;
});

test('2. customer UI dashboard lists the plan with pending approval', async ({ page }) => {
  await injectAuth(page, customerToken);
  await page.goto(`${UI}/?page=dashboard`);
  await dismissCookieBanner(page);
  await page.getByRole('button', { name: 'EMI Plans' }).click();

  const card = page.getByText('QA EMI Pack', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
  await expect(card).toBeVisible();
  await expect(card.getByText('pending approval', { exact: true })).toBeVisible();
});

test('3. admin UI approves plan -> active with schedule, first due next month', async ({ page, request }) => {
  await injectAuth(page, adminToken);
  await page.goto(`${UI}/?page=admin&tab=emi`);
  await dismissCookieBanner(page);

  const card = page.getByText('QA EMI Pack', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
  await expect(card.getByText('pending approval', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Review Application' }).click();

  await expect(page.getByText(/EMI Application/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve Plan' })).toBeVisible();
  await page.getByRole('button', { name: 'Approve Plan' }).click();

  // Success message suppressed by the immediate detail refetch (see bug probe 10).
  await expect(page.getByText(/Installment Schedule \(12\)/)).toBeVisible();

  // Schedule rows render with due dates; first due is next calendar month.
  const firstRow = page.getByText('#1', { exact: true }).locator('xpath=ancestor::div[contains(@class,"p-3")][1]');
  await expect(firstRow).toBeVisible();
  await expect(firstRow.getByText(/Due/)).toBeVisible();

  const detail = await api(request, 'GET', `/api/user/emi/${appId}`, undefined, customerToken);
  expect(detail.status).toBe(200);
  const d = detail.data as any;
  expect(d.application.status).toBe('active');
  expect(d.payments).toHaveLength(12);
  expect(isNextMonthIso(d.payments[0].dueDate)).toBe(true);
  payment1Id = d.payments[0].id;
  payment2Id = d.payments[1].id;
});

test('4. customer UI pays first installment with UTR + evidence -> pending verification', async ({ page }) => {
  await injectAuth(page, customerToken);
  await page.goto(`${UI}/?page=dashboard`);
  await dismissCookieBanner(page);
  await page.getByRole('button', { name: 'EMI Plans' }).click();

  const card = page.getByText('QA EMI Pack', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
  await card.getByRole('button', { name: 'View Plan' }).click();

  const firstRow = card.locator('tbody tr').nth(0);
  await firstRow.getByRole('button', { name: 'Pay' }).click();

  await expect(page.getByText('Pay Installment #1', { exact: false })).toBeVisible();
  await page.getByPlaceholder('e.g. 402137896541').fill('987654321012');
  await page.locator('input[type="file"]').setInputFiles(ASSET_PATH);
  await expect(page.getByAltText('Payment evidence')).toBeVisible();
  await page.getByRole('button', { name: 'Submit Payment' }).click();

  // Payment submitted -> installment #1 flips to pending verification.
  await expect(card.getByText('pending verification', { exact: true })).toBeVisible();
});

test('5. in-order rule blocks paying installment #2 while #1 is pending', async ({ page, request }) => {
  // API: paying #2 returns 409.
  const r = await api(request, 'POST', `/api/emi/${appId}/pay-installment`, {
    installmentId: payment2Id,
    utr: '987654321013',
    evidenceImage: pngDataUrl(),
  }, customerToken);
  expect(r.status).toBe(409);

  // UI: the attempt surfaces the 409 error in the pay modal (the Pay button is
  // offered on #2, but the server rejects it as out-of-order).
  await injectAuth(page, customerToken);
  await page.goto(`${UI}/?page=dashboard`);
  await dismissCookieBanner(page);
  await page.getByRole('button', { name: 'EMI Plans' }).click();
  const card = page.getByText('QA EMI Pack', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
  await card.getByRole('button', { name: 'View Plan' }).click();

  const secondRow = card.locator('tbody tr').nth(1);
  await secondRow.getByRole('button', { name: 'Pay' }).click();
  await page.getByPlaceholder('e.g. 402137896541').fill('987654321013');
  await page.locator('input[type="file"]').setInputFiles(ASSET_PATH);
  await expect(page.getByAltText('Payment evidence')).toBeVisible();
  await page.getByRole('button', { name: 'Submit Payment' }).click();

  await expect(page.getByText('Please pay installments in order.')).toBeVisible();
});

test('6. admin UI verifies installment #1 -> paid, progress 1/12', async ({ page, request }) => {
  await injectAuth(page, adminToken);
  await page.goto(`${UI}/?page=admin&tab=emi`);
  await dismissCookieBanner(page);

  const card = page.getByText('QA EMI Pack', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
  await card.getByRole('button', { name: 'Review Application' }).click();

  const firstRow = page.getByText('#1', { exact: true }).locator('xpath=ancestor::div[contains(@class,"p-3")][1]');
  await expect(firstRow.getByText('pending_verification', { exact: true })).toBeVisible();
  await firstRow.getByRole('button', { name: 'Verify' }).click();
  await expect(firstRow.getByText('paid', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Close modal' }).click();
  await expect(card.getByText(/1\/12/)).toBeVisible();

  const detail = await api(request, 'GET', `/api/user/emi/${appId}`, undefined, customerToken);
  expect(((detail.data as any).application.installmentsPaid)).toBe(1);
});

test('7. outstanding balance after payment is ~9166.67 (±0.5)', async ({ request }) => {
  const r = await api(request, 'GET', '/api/user/emi', undefined, customerToken);
  expect(r.status).toBe(200);
  const apps = (r.data as any).applications as any[];
  const mine = apps.find((a: any) => a.id === appId);
  expect(mine).toBeTruthy();
  expect(Math.abs(mine.outstandingBalance - 9166.67)).toBeLessThanOrEqual(0.5);
});

test('8. overdue shape: approved app for customer2 exposes per-payment status', async ({ request }) => {
  // Create + approve an EMI app for qa_customer2 via API (no DB tweaks).
  const apply = await api(request, 'POST', '/api/emi/apply', {
    productTitle: 'QA EMI Pack C2',
    totalAmount: 6000,
    initialPayment: 1000,
    tenureMonths: 6,
  }, customer2Token);
  expect(apply.status).toBe(201);
  const c2AppId = (apply.data as any).application.id;

  const approve = await api(request, 'PUT', `/api/admin/emi/${c2AppId}/status`, { status: 'active' }, adminToken);
  expect(approve.status).toBe(200);

  const list = await api(request, 'GET', '/api/user/emi', undefined, customer2Token);
  const apps = (list.data as any).applications as any[];
  const mine = apps.find((a: any) => a.id === c2AppId);
  expect(mine).toBeTruthy();
  expect(mine.status).toBe('active');

  const detail = await api(request, 'GET', `/api/user/emi/${c2AppId}`, undefined, customer2Token);
  expect(detail.status).toBe(200);
  const payments = (detail.data as any).payments as any[];
  expect(payments).toHaveLength(6);

  let lateSeen = false;
  for (const p of payments) {
    expect(typeof p.status).toBe('string');
    expect(['pending', 'late', 'paid', 'pending_verification']).toContain(p.status);
    if (p.status === 'late') lateSeen = true;
  }
  // Today no installments are past due, so no late rows are expected.
  expect(lateSeen).toBe(false);
  console.info('[EMI][overdue-shape] payments carry status field; late rows not observed today');
});

test.describe('bug probes (independent of serial flow)', () => {
  test.describe.configure({ mode: 'default' });

  test('9. EMI pay success feedback is shown after submitting installment proof (bug probe)', async ({ page }) => {
  // Installment #2 is still payable; the reported UX is a success message after
  // submission. Observed: the message is set and then immediately cleared by the
  // detail refetch that follows (EmiSection.tsx fetchDetail resets payFeedback).
  test.info().annotations.push({
    type: 'bug',
    description:
      'EMI installment payment success feedback never displays: handlePay() sets payFeedback, then immediately calls fetchDetail() which resets it to null (EmiSection.tsx). The installment still flips to pending verification, but the user never sees the confirmation message.',
  });

  await injectAuth(page, customerToken);
  await page.goto(`${UI}/?page=dashboard`);
  await dismissCookieBanner(page);
  await page.getByRole('button', { name: 'EMI Plans' }).click();

  const card = page.getByText('QA EMI Pack', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
  await card.getByRole('button', { name: 'View Plan' }).click();

  const secondRow = card.locator('tbody tr').nth(1);
  await secondRow.getByRole('button', { name: 'Pay' }).click();
  await page.getByPlaceholder('e.g. 402137896541').fill('987654321014');
  await page.locator('input[type="file"]').setInputFiles(ASSET_PATH);
  await expect(page.getByAltText('Payment evidence')).toBeVisible();
  await page.getByRole('button', { name: 'Submit Payment' }).click();

  await expect(page.getByText(/Payment for installment #2 submitted/)).toBeVisible({ timeout: 3000 });
  });
});
