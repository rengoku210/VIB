/**
 * Advertisement regression spec (UI + API).
 *
 * - GET /api/advertisement/plans returns non-empty plans.
 * - /advertise UI: plans render, first plan -> order form (name/email/phone/
 *   UTR/screenshot) -> success state (order created, pending).
 * - Admin approves the order; customer token-flow submits campaign details
 *   (verify -> submit-details); admin marks the order live; status transitions
 *   verified via the admin list.
 */
import { test, expect, Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, login, QA } from '../helpers/api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_PNG = path.join(__dirname, '..', 'assets', '1x1.png');
const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/** Dismisses the fixed-bottom cookie banner when present (same z-50 as modals). */
async function dismissCookieBanner(page: Page) {
  const accept = page.getByRole('button', { name: 'Accept All Cookies' });
  try {
    if (await accept.isVisible({ timeout: 2_000 })) {
      await accept.click();
    }
  } catch {
    /* not present */
  }
}

async function adminOrders(request: any, adminToken: string, search: string) {
  const res = await api(
    request,
    'GET',
    `/api/admin/advertisement/orders?search=${encodeURIComponent(search)}`,
    undefined,
    adminToken,
  );
  expect(res.status).toBe(200);
  return (res.data.orders as any[]) ?? [];
}

test.describe('Advertisement', () => {
  test('GET /api/advertisement/plans returns non-empty plans', async ({ request }) => {
    const res = await api(request, 'GET', '/api/advertisement/plans');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data?.plans)).toBe(true);
    expect(res.data.plans.length).toBeGreaterThan(0);
  });

  test('UI: /advertise order flow creates pending order', async ({ page }) => {
    await page.goto('/advertise');
    await dismissCookieBanner(page);

    const grid = page.locator('#ad-plans-grid');
    await expect(grid).toBeVisible({ timeout: 20_000 });
    const firstBuy = grid.getByRole('button', { name: /Buy Now/ }).first();
    await expect(firstBuy).toBeVisible();
    await firstBuy.click();

    const modal = page.getByText('VIB Advertisement Checkout').locator(
      'xpath=ancestor::div[contains(@class,"fixed inset-0")]',
    );
    await expect(modal).toBeVisible();

    // Step 1 -> 2.
    await modal.getByRole('button', { name: /Continue to Customer Details/ }).click();

    // Step 2: customer details.
    const marker = Date.now().toString().slice(-6);
    await modal.getByPlaceholder('e.g. Rahul Sharma').fill(`QA Customer ${marker}`);
    await modal.getByPlaceholder('e.g. rahul@example.com').fill(QA.customer.email);
    await modal.getByPlaceholder('e.g. +91 9876543210').fill('+91 90000 00000');
    await modal.getByRole('button', { name: /Proceed to Manual UPI Payment/ }).click();

    // Step 3: payment evidence (UTR + screenshot).
    const utr = `UTR${Date.now().toString().slice(-9)}`;
    await modal.getByPlaceholder('e.g. 423589102938').fill(utr);
    await modal.locator('input[type="file"]').first().setInputFiles(ASSET_PNG);
    await modal.getByRole('button', { name: /Complete & Submit Order/ }).click();

    // Step 4: success state with order id.
    await expect(modal.getByText('PAYMENT SUBMITTED FOR VERIFICATION!')).toBeVisible({ timeout: 20_000 });
    const orderId = (await modal.locator('span', { hasText: 'ORDER ID:' }).locator('xpath=following-sibling::span').innerText()).trim();
    expect(orderId).toMatch(/^AD-VIB-/);
  });

  test('admin approves pending advertisement order; status -> approved', async ({ request }) => {
    const adminToken = await login(request, QA.admin.email, QA.admin.password);
    const orders = await adminOrders(request, adminToken, QA.customer.email);
    const pending = orders.find(
      (o) => o.customer_email?.toLowerCase() === QA.customer.email && o.status === 'pending_payment',
    );
    if (!pending) {
      test.skip(true, 'No pending advertisement order for qa_customer');
      return;
    }

    const approve = await api(request, 'POST', `/api/admin/advertisement/orders/${pending.id}/approve`, {}, adminToken);
    expect(approve.status).toBe(200);

    const after = await adminOrders(request, adminToken, pending.id);
    expect(after.find((o) => o.id === pending.id)?.status).toBe('approved');
  });

  test('customer token flow: verify then submit ad details', async ({ request }) => {
    const adminToken = await login(request, QA.admin.email, QA.admin.password);
    const orders = await adminOrders(request, adminToken, QA.customer.email);
    const approved = orders.find((o) => o.status === 'approved');
    if (!approved) {
      test.skip(true, 'No approved advertisement order for qa_customer');
      return;
    }

    const verify = await api(
      request,
      'GET',
      `/api/advertisement/orders/verify?orderId=${encodeURIComponent(approved.id)}&token=${encodeURIComponent(approved.submission_token)}`,
    );
    expect(verify.status).toBe(200);
    expect(verify.data?.eligible).toBe(true);

    const submit = await api(request, 'POST', `/api/advertisement/orders/${approved.id}/submit-details`, {
      token: approved.submission_token,
      instagramUsername: `qa_inventory_${Date.now()}`,
      sellingPrice: '12500',
      currentRank: 'Ascendant 2',
      premiumSkins: 'Kuronami Vandal',
      otherValuableItems: '160 Radianite Points',
      inventoryScreenshot: PNG_DATA_URL,
    });
    expect(submit.status).toBe(200);

    const after = await adminOrders(request, adminToken, approved.id);
    expect(after.find((o) => o.id === approved.id)?.status).toBe('details_submitted');
  });

  test('admin marks order live; status -> live', async ({ request }) => {
    const adminToken = await login(request, QA.admin.email, QA.admin.password);
    const orders = await adminOrders(request, adminToken, QA.customer.email);
    const submittable = orders.find((o) => ['details_submitted', 'approved'].includes(o.status));
    if (!submittable) {
      test.skip(true, 'No approved/details_submitted advertisement order for qa_customer');
      return;
    }

    const live = await api(
      request,
      'POST',
      `/api/admin/advertisement/orders/${submittable.id}/mark-live`,
      {},
      adminToken,
    );
    expect(live.status).toBe(200);

    const after = await adminOrders(request, adminToken, submittable.id);
    expect(after.find((o) => o.id === submittable.id)?.status).toBe('live');
  });
});
