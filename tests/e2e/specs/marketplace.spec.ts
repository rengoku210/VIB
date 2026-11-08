/**
 * Marketplace (Digital Profiles) UI regression spec.
 *
 * Covers: browse profiles, header search, listing detail, cart add/remove,
 * checkout order creation (stopped before payment evidence) and the
 * customer dashboard Orders tab.
 *
 * Auth tokens are injected via injectAuth() (these tests do not target auth).
 * Selectors are accessibility-first (getByRole/getByLabel/getByPlaceholder).
 */
import { test, expect, Page } from '@playwright/test';
import { api, login, injectAuth, QA } from '../helpers/api';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Dismisses the fixed-bottom cookie consent banner when present. The banner
 * shares the z-50 stacking context with the cart drawer and checkout modal and
 * intercepts pointer events over their footer actions (app bug, see README).
 */
async function dismissCookieBanner(page: Page) {
  const accept = page.getByRole('button', { name: 'Accept All Cookies' });
  try {
    if (await accept.isVisible({ timeout: 2_000 })) {
      await accept.click();
    }
  } catch {
    /* banner already dismissed or not rendered */
  }
}

/**
 * Waits for the profiles page to settle into one of two states:
 * - 'cards':   at least one listing card rendered (View Details button).
 * - 'empty':   the graceful empty state heading is visible.
 */
async function waitForListingsState(page: Page): Promise<'cards' | 'empty'> {
  const cards = page.getByRole('button', { name: 'View Details' });
  const emptyHeading = page.getByRole('heading', {
    name: /No profiles found matching your search or filters/i,
  });
  try {
    await expect.poll(async () => (await cards.count()) > 0, { timeout: 15_000 }).toBe(true);
    return 'cards';
  } catch {
    await expect(emptyHeading).toBeVisible({ timeout: 5_000 });
    return 'empty';
  }
}

/** Ensures at least one marketplace tab (Guaranteed or Public) shows cards. */
async function ensureAnyListings(page: Page): Promise<boolean> {
  if ((await waitForListingsState(page)) === 'cards') return true;
  const publicTab = page.getByRole('button', { name: /Select Public Listings marketplace/ });
  if (await publicTab.isVisible()) {
    await publicTab.click();
  }
  return (await waitForListingsState(page)) === 'cards';
}

test.describe('Marketplace profiles', () => {
  test('browse profiles renders listing cards or graceful empty state', async ({ page }) => {
    await page.goto('/?page=profiles');
    await expect(page).toHaveURL(/page=profiles/);

    const state = await waitForListingsState(page);
    if (state === 'cards') {
      await expect(page.getByRole('button', { name: 'View Details' }).first()).toBeVisible();
    } else {
      await expect(
        page.getByRole('heading', { name: /No profiles found matching your search or filters/i }),
      ).toBeVisible();
    }
  });

  test('search control updates results (empty state for unmatched query)', async ({ page }) => {
    await page.goto('/?page=profiles');

    const search = page.getByLabel('Search profiles and services');
    await expect(search).toBeVisible(); // record finding in README if this ever disappears
    const query = `zznomatch${Date.now()}`;
    await search.fill(query);
    await search.press('Enter');

    await expect(page).toHaveURL(/page=profiles/);
    // Search notification pill shows the query was applied.
    await expect(page.getByText(/Filtering profiles matching/)).toBeVisible();
    // No listing can match the random token -> empty state must appear.
    await expect(
      page.getByRole('heading', { name: /No profiles found matching your search or filters/i }),
    ).toBeVisible();
  });

  test('listing detail page shows title, price and images', async ({ page }) => {
    await page.goto('/?page=profiles');
    const rendered = await ensureAnyListings(page);
    if (!rendered) {
      test.skip(true, 'No published listings exist in the database');
      return;
    }

    const firstCard = page.getByRole('button', { name: 'View Details' }).first();
    const card = firstCard.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    const title = (await card.locator('h3').first().innerText()).trim();

    await firstCard.click();
    await expect(page).toHaveURL(/[?&]page=listing&id=/);

    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.locator('text=/^₹[\\d,]+$/').first()).toBeVisible();
    await expect.poll(async () => page.locator('main img').count(), { timeout: 10_000 }).toBeGreaterThan(0);
  });

  test('cart drawer: add item then remove -> drawer empty', async ({ page }) => {
    await page.goto('/?page=profiles');
    // Dismiss consent before opening overlays: the banner (z-30) now renders below
    // modal/drawer overlays (z-50), so it cannot be clicked while the drawer is open.
    await dismissCookieBanner(page);
    const rendered = await ensureAnyListings(page);
    if (!rendered) {
      test.skip(true, 'No published listings exist in the database');
      return;
    }

    const addButton = page.getByRole('button', { name: /^Add .* to cart$/ }).first();
    const label = (await addButton.getAttribute('aria-label')) ?? '';
    const title = label.replace(/^Add /, '').replace(/ to cart$/, '');
    expect(title).toBeTruthy();

    await addButton.click();
    const drawer = page.getByRole('dialog', { name: 'Shopping Cart' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(title)).toBeVisible();

    await drawer.getByRole('button', { name: new RegExp(`^Remove ${escapeRegExp(title)} from cart$`) }).click();
    await expect(drawer.getByText('Your cart is empty')).toBeVisible();
  });

  test('checkout creates order and displays Order ID before payment evidence', async ({ page, request }) => {
    const customerToken = await login(request, QA.customer.email, QA.customer.password);
    await injectAuth(page, customerToken);

    await page.goto('/?page=profiles');
    // Dismiss consent before opening overlays (banner sits below z-50 overlays).
    await dismissCookieBanner(page);
    const rendered = await ensureAnyListings(page);
    if (!rendered) {
      test.skip(true, 'No published listings exist in the database');
      return;
    }

    const addButton = page.getByRole('button', { name: /^Add .* to cart$/ }).first();
    await addButton.click();
    const drawer = page.getByRole('dialog', { name: 'Shopping Cart' });
    await drawer.getByRole('button', { name: /Proceed to Checkout/ }).click();

    // Fill checkout form (Riot ID used only for server-side format validation).
    await page.locator('#input-riot-name').fill(`QaCheckout${Date.now().toString().slice(-6)}`);
    await page.locator('#input-riot-tag').fill('IND1');
    await page.locator('#input-delivery-email').fill(QA.customer.email);
    await page.locator('#btn-confirm-payment').click();

    // Order creation succeeded => modal moves to the 'payment_qr' stage (stop here,
    // do NOT submit payment evidence).
    await expect(page.getByText(/Scan & Pay via UPI/)).toBeVisible({ timeout: 20_000 });
    const refNode = page.getByText(/Order Reference:/).first();
    await expect(refNode).toBeVisible();
    const refText = await refNode.innerText();
    const match = refText.match(/#(ord_[a-f0-9]+)/);
    expect(match).not.toBeNull();
    const orderId = match![1];

    // Server-side confirmation: order exists with AWAITING_PAYMENT.
    const ordersRes = await api(request, 'GET', '/api/user/orders', undefined, customerToken);
    expect(ordersRes.status).toBe(200);
    const created = (ordersRes.data.orders as any[]).find((o) => o.id === orderId);
    expect(created).toBeTruthy();
    expect(created.payment_status).toBe('AWAITING_PAYMENT');
    expect(created.status).toBe('processing');
  });

  test('dashboard Orders tab shows the created order awaiting payment', async ({ page, request }) => {
    const customerToken = await login(request, QA.customer.email, QA.customer.password);

    // Create a deterministically identifiable cart order via API against a published listing.
    const listRes = await api(request, 'GET', '/api/listings?limit=5');
    const listings: any[] = listRes.data?.listings ?? [];
    if (listings.length === 0) {
      test.skip(true, 'No published listings exist in the database');
      return;
    }
    const listing = listings[0];
    const titleExpr = `Cart Checkout: ${listing.title} (x1)`;
    const orderRes = await api(
      request,
      'POST',
      '/api/user/orders',
      {
        product_id: listing.id,
        title: titleExpr,
        amount: Number(listing.price_inr),
        currency: 'INR',
        type: 'cart',
        paymentMethod: 'UPI Manual QR Verification',
        details: {
          riotId: `QAOrder${Date.now().toString().slice(-6)}#IND1`,
          email: QA.customer.email,
          cartItems: [{ id: listing.id, quantity: 1 }],
        },
      },
      customerToken,
    );
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.data.order.id;

    await injectAuth(page, customerToken);
    await page.goto('/?page=dashboard');
    await dismissCookieBanner(page);
    await page.getByRole('button', { name: /^Orders/ }).click();

    const orderText = page.getByText(orderId).first();
    await expect(orderText).toBeVisible({ timeout: 20_000 });
    const row = orderText.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    await expect(row.getByText(titleExpr)).toBeVisible();
    await expect(row.getByText('processing')).toBeVisible();
  });
});
