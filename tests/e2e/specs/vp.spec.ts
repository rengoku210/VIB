/**
 * VP Packs regression spec.
 *
 * - /?page=vp-catalog renders the Indian VP catalog backed by /api/vp-stock
 *   (package prices + stock pills when present).
 * - Choosing a package opens checkout; order creation succeeds and the order
 *   amount matches the displayed unit price.
 * - /?page=vp (regional hub, static catalog) renders; its Buy buttons' product
 *   IDs are validated against the server catalog (finding if any are missing).
 */
import { test, expect, Page } from '@playwright/test';
import { api, login, injectAuth, QA } from '../helpers/api';

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

// Mirrors ClientIndianVPPage.vpPacks (display order, id mapping, price).
const INDIAN_PACKS = [
  { vp: '475 VP', id: 'vp-in-475', price: 499 },
  { vp: '1,000 VP', id: 'vp-in-1000', price: 999 },
  { vp: '2,050 VP', id: 'vp-in-2050', price: 1899 },
  { vp: '3,650 VP', id: 'vp-in-3650', price: 3199 },
  { vp: '5,350 VP', id: 'vp-in-5350', price: 4499 },
  { vp: '7,400 VP', id: 'vp-in-7400', price: 6199 },
  { vp: '11,000 VP', id: 'vp-in-11000', price: 8999 },
  { vp: '14,650 VP', id: 'vp-in-14650', price: 11999 },
  { vp: '22,000 VP', id: 'vp-in-22000', price: 17999 },
  { vp: '44,000 VP', id: 'vp-in-44000', price: 34999 },
  { vp: '66,000 VP', id: 'vp-in-66000', price: 49999 },
  { vp: '110,000 VP', id: 'vp-in-110000', price: 79999 },
  { vp: '220,000 VP', id: 'vp-in-220000', price: 149999 },
];

// Mirrors ClientVPOverviewPage.phpPacks.
const PHILIPPINES_PACKS = [
  { vp: '475 VP', id: 'vp-ph-475', price: 299 },
  { vp: '1,000 VP', id: 'vp-ph-1000', price: 549 },
  { vp: '1,475 VP', id: 'vp-ph-1475', price: 799 },
  { vp: '2,050 VP', id: 'vp-ph-2050', price: 1099 },
  { vp: '2,525 VP', id: 'vp-ph-2525', price: 1349 },
  { vp: '3,050 VP', id: 'vp-ph-3050', price: 1599 },
  { vp: '3,650 VP', id: 'vp-ph-3650', price: 1999 },
];

test.describe('VP Packs', () => {
  test('vp-catalog renders packages with prices; stock UI reflects API', async ({ page, request }) => {
    const stockRes = await api(request, 'GET', '/api/vp-stock');
    expect(stockRes.status).toBe(200);
    const stock: any[] = stockRes.data?.stock ?? [];
    expect(Array.isArray(stock)).toBe(true);

    await page.goto('/?page=vp-catalog');
    await dismissCookieBanner(page);

    // Pack cards render (VP labels).
    await expect.poll(async () => page.locator('text=/VP$/').count(), { timeout: 15_000 }).toBeGreaterThan(0);
    // Price chips render.
    await expect(page.locator('text=/^₹[\\d,]+$/').first()).toBeVisible();

    // Stock pills/counts if the UI exposes them.
    const stockPills = page.locator('text=/in stock|Sold Out/');
    if ((await stockPills.count()) > 0) {
      await expect(stockPills.first()).toBeVisible();
    }
  });

  test('choose in-stock package -> order created at displayed unit price', async ({ page, request }) => {
    const token = await login(request, QA.customer.email, QA.customer.password);
    await injectAuth(page, token);

    const stockRes = await api(request, 'GET', '/api/vp-stock');
    const stock: any[] = stockRes.data?.stock ?? [];
    // Normalise like the UI does: raw id, 'vp-<bare>', 'in-<bare>'.
    const available = new Map<string, number>();
    for (const s of stock) {
      const rawId = String(s.package_id);
      const count = Number(s.available ?? 0);
      const bare = rawId.replace(/^(vp-|in-)/, '');
      available.set(rawId, count);
      available.set(`vp-${bare}`, count);
      available.set(`in-${bare}`, count);
    }

    // Pick first pack (in display order) that has stock.
    const chosen = INDIAN_PACKS.find((p) => (available.get(`vp-${p.id.replace('vp-in-', '')}`) ?? 0) > 0);
    if (!chosen) {
      test.skip(true, 'No Indian VP pack currently in stock');
      return;
    }

    await page.goto('/?page=vp-catalog');
    await dismissCookieBanner(page);
    const buyButtons = page.getByRole('button', { name: /Buy Now/ });
    await expect(buyButtons.first()).toBeVisible({ timeout: 15_000 });
    const idx = INDIAN_PACKS.findIndex((p) => p.id === chosen.id);
    await buyButtons.nth(idx).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(chosen.vp).first()).toBeVisible();

    // Unit price shown in checkout matches the displayed card price.
    const expectedPrice = `₹${chosen.price.toLocaleString('en-IN')}`;
    await expect(modal.getByText(expectedPrice).first()).toBeVisible();

    await page.locator('#input-riot-name').fill(`QaVp${Date.now().toString().slice(-5)}`);
    await page.locator('#input-riot-tag').fill('IND1');
    await page.locator('#input-delivery-email').fill(QA.customer.email);
    await page.locator('#btn-confirm-payment').click();

    await expect(page.getByText(/Scan & Pay via UPI/)).toBeVisible({ timeout: 20_000 });
    const refNode = page.getByText(/Order Reference:/).first();
    const refText = await refNode.innerText();
    const match = refText.match(/#(ord_[a-f0-9]+)/);
    expect(match).not.toBeNull();
    const orderId = match![1];

    const ordersRes = await api(request, 'GET', '/api/user/orders', undefined, token);
    expect(ordersRes.status).toBe(200);
    const created = (ordersRes.data.orders as any[]).find((o) => o.id === orderId);
    expect(created).toBeTruthy();
    expect(Number(created.amount)).toBe(chosen.price);
    expect(created.payment_status).toBe('AWAITING_PAYMENT');
  });

  test('regional hub (/?page=vp) renders static catalog', async ({ page }) => {
    await page.goto('/?page=vp');
    await dismissCookieBanner(page);
    await expect(page.getByRole('heading', { name: /VP PACKS/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Buy Now/ }).first()).toBeVisible();
  });

  test('regional hub buy buttons reference existing catalog products', async ({ request }) => {
    const missing: string[] = [];
    const check = async (id: string) => {
      const r = await api(request, 'GET', `/api/products/${id}`);
      if (r.status !== 200) missing.push(id);
    };
    for (const p of INDIAN_PACKS) await check(p.id);
    for (const p of PHILIPPINES_PACKS) await check(p.id);

    if (missing.length > 0) {
      test.info().annotations.push({
        type: 'bug',
        description: `Regional hub buy buttons reference non-existent product IDs: ${missing.join(', ')}`,
      });
    }
    expect(missing).toEqual([]);
  });
});
