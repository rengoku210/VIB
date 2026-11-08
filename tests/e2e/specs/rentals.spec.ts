/**
 * Rentals regression spec (UI + API).
 *
 * UI: /?page=rentals renders available rentals (admin-created test listing is
 * used to guarantee deterministic data); detail modal shows price/duration.
 *
 * API (core conflict): admin creates a rental listing, customer A books it,
 * customer B must NOT be able to book the same listing (409/404 expected).
 * Then admin activates and completes the booking; customer A's booking is
 * visible in GET /api/user/my-rentals.
 */
import { test, expect, Page } from '@playwright/test';
import { api, login, QA } from '../helpers/api';

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

async function createRentalListing(request: any, adminToken: string, title: string) {
  const res = await api(request, 'POST', '/api/admin/rentals', {
    title,
    description: 'E2E rental listing (created by regression suite)',
    price_24h: 399,
    price_3d: 799,
    price_7d: 1499,
    price_30d: 3999,
    security_deposit: 500,
  }, adminToken);
  expect(res.status).toBe(201);
  return res.data.listing as { id: string; title: string };
}

test.describe('Rentals', () => {
  test('rentals page lists available rentals; detail modal shows price/duration', async ({ page, request }) => {
    const adminToken = await login(request, QA.admin.email, QA.admin.password);
    const title = `QA Rental ${Date.now()}`;
    await createRentalListing(request, adminToken, title);

    await page.goto('/?page=rentals');
    await dismissCookieBanner(page);
    const titleText = page.getByText(title).first();
    await expect(titleText).toBeVisible({ timeout: 20_000 });

    const card = titleText.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    // Default duration selected on load is 24h -> ₹399 + deposit pill.
    await expect(card.getByText('₹399')).toBeVisible();
    await expect(card.getByText(/\+₹500 refundable deposit/)).toBeVisible();

    await card.getByRole('button', { name: /Rent Now/ }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/Rental Access Duration/)).toBeVisible();
    await expect(modal.getByText(/Selected duration: 24h/)).toBeVisible();
    await expect(modal.getByText('₹399').first()).toBeVisible();
  });

  test('two customers cannot book the same rental listing (inventory conflict)', async ({ request }) => {
    const adminToken = await login(request, QA.admin.email, QA.admin.password);
    const aToken = await login(request, QA.customer.email, QA.customer.password);
    const bToken = await login(request, QA.customer2.email, QA.customer2.password);

    const listing = await createRentalListing(request, adminToken, `QA Conflict ${Date.now()}`);

    // a. Customer A books -> order/booking created.
    const bookA = await api(request, 'POST', `/api/rentals/${listing.id}/book`, {
      duration: '24h',
      paymentMethod: 'UPI_QR',
      transactionRef: 'UTR_TEST123',
    }, aToken);
    expect(bookA.status).toBe(201);
    const bookingIdA: string = bookA.data.bookingId;

    // b. Customer B must NOT be able to book the same listing (409/404). NOT 200.
    const bookB = await api(request, 'POST', `/api/rentals/${listing.id}/book`, {
      duration: '24h',
      paymentMethod: 'UPI_QR',
      transactionRef: 'UTR_TEST456',
    }, bToken);
    if (bookB.status === 200 || bookB.status === 201) {
      test.info().annotations.push({
        type: 'bug',
        description:
          `Second customer successfully booked already-booked rental listing ${listing.id} ` +
          `(status ${bookB.status}). Rental inventory is not reserved on booking, so two ` +
          `customers can reserve the same unavailable inventory. Expected 409/404.`,
      });
    }
    expect([404, 409]).toContain(bookB.status);

    // c. Admin activates booking A.
    const activate = await api(request, 'POST', `/api/admin/rentals/bookings/${bookingIdA}/activate`, {}, adminToken);
    expect(activate.status).toBe(200);

    // d. Admin completes booking A.
    const complete = await api(request, 'POST', `/api/admin/rentals/bookings/${bookingIdA}/complete`, {}, adminToken);
    expect(complete.status).toBe(200);
  });

  test('GET /api/user/my-rentals returns customer booking', async ({ request }) => {
    const adminToken = await login(request, QA.admin.email, QA.admin.password);
    const aToken = await login(request, QA.customer.email, QA.customer.password);

    const listing = await createRentalListing(request, adminToken, `QA MyRentals ${Date.now()}`);
    const book = await api(request, 'POST', `/api/rentals/${listing.id}/book`, {
      duration: '24h',
      paymentMethod: 'UPI_QR',
      transactionRef: 'UTR_TEST789',
    }, aToken);
    expect(book.status).toBe(201);

    const mine = await api(request, 'GET', '/api/user/my-rentals', undefined, aToken);
    expect(mine.status).toBe(200);
    const found = (mine.data.bookings as any[]).find((b) => b.id === book.data.bookingId);
    expect(found).toBeTruthy();
    expect(found.listing_id).toBe(listing.id);
    expect(found.status).toBe('pending_activation');
    expect(Number(found.total_paid)).toBeGreaterThan(0);
  });
});
