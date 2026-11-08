/**
 * Responsive viewport regression — overflow, navigation, sidebar, modal fit.
 *
 * Viewport groups:
 *   - 390x844 (mobile): home overflow + mobile menu drawer; dashboard drawer with
 *     KYC Verification / EMI Plans; AuthModal fits viewport with scrollable content.
 *   - 768x1024 (tablet): home + dashboard layout intact, no horizontal overflow.
 *   - 1440x900 (desktop): dashboard sidebar visible with groups; collapse hides
 *     labels; expand restores.
 *
 * Every viewport asserts NO horizontal overflow on home, profiles, dashboard
 * (customer token) and admin (admin token).
 */
import { test, expect } from '@playwright/test';
import { login, injectAuth, QA } from '../helpers/api';

const UI = 'http://localhost:3000';

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

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const ok = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth <= window.innerWidth + 1;
  });
  expect(ok, 'documentElement.scrollWidth must not exceed innerWidth + 1').toBe(true);
}

const DASH_HAMBURGER = 'xpath=//button[@aria-label="Open navigation menu" and not(@aria-controls)]';

test.describe('mobile 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  let customerToken = '';
  let adminToken = '';

  test.beforeAll(async ({ request }) => {
    customerToken = await loginRobust(request, QA.customer.email, QA.customer.password);
    adminToken = await loginRobust(request, QA.admin.email, QA.admin.password);
  });

  test('home page: no overflow; header mobile menu opens drawer', async ({ page }) => {
    await page.goto(`${UI}/`);
    await dismissCookieBanner(page);
    await expectNoHorizontalOverflow(page);

    const hamburger = page.getByRole('button', { name: 'Open navigation menu' });
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    await expect(page.getByRole('navigation', { name: 'Mobile Navigation' })).toBeVisible();
  });

  test('dashboard: drawer lists KYC Verification/EMI Plans; selecting closes drawer', async ({ page }) => {
    await injectAuth(page, customerToken);
    await page.goto(`${UI}/?page=dashboard`);
    await dismissCookieBanner(page);
    await expectNoHorizontalOverflow(page);

    await page.locator(DASH_HAMBURGER).click();
    const drawer = page.getByRole('button', { name: 'KYC Verification' });
    await expect(drawer).toBeVisible();
    await expect(page.getByRole('button', { name: 'EMI Plans' })).toBeVisible();

    await drawer.click();
    await expect(page.getByRole('button', { name: 'EMI Plans' })).toBeHidden();
    await expect(page.getByRole('heading', { name: /KYC Identity Verification/ })).toBeVisible();
  });

  test('modal fits viewport with scrollable content (AuthModal signup)', async ({ page }) => {
    await page.goto(`${UI}/`);
    await dismissCookieBanner(page);
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('navigation', { name: 'Mobile Navigation' }).getByRole('button', { name: 'Sign Up' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Let the enter animation / web fonts settle before measuring.
    await page.waitForTimeout(600);

    await expect.poll(async () => {
      const b = await dialog.boundingBox();
      return b ? Math.round(b.y) : -9999;
    }, { timeout: 5000 }).toBeGreaterThanOrEqual(0);

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);

    const scroller = dialog.locator('div.overflow-y-auto');
    await expect(scroller.first()).toBeVisible();
    const scrollable = await scroller.first().evaluate((el: HTMLElement) => {
      const cs = getComputedStyle(el);
      return el.scrollHeight >= el.clientHeight && (cs.overflowY === 'auto' || cs.overflowY === 'scroll');
    });
    expect(scrollable).toBe(true);
  });

  test('profiles page has no horizontal overflow', async ({ page }) => {
    await page.goto(`${UI}/?page=profiles`);
    await expectNoHorizontalOverflow(page);
  });

  test('admin page has no horizontal overflow', async ({ page }) => {
    await injectAuth(page, adminToken);
    await page.goto(`${UI}/?page=admin`);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('tablet 768x1024', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  let customerToken = '';
  let adminToken = '';

  test.beforeAll(async ({ request }) => {
    customerToken = await loginRobust(request, QA.customer.email, QA.customer.password);
    adminToken = await loginRobust(request, QA.admin.email, QA.admin.password);
  });

  test('home + profiles have no horizontal overflow and header is intact', async ({ page }) => {
    await page.goto(`${UI}/`);
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto(`${UI}/?page=profiles`);
    await expectNoHorizontalOverflow(page);
  });

  test('dashboard + admin have no horizontal overflow', async ({ page }) => {
    await injectAuth(page, customerToken);
    await page.goto(`${UI}/?page=dashboard`);
    await expectNoHorizontalOverflow(page);

    await injectAuth(page, adminToken);
    await page.goto(`${UI}/?page=admin`);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('desktop 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  let customerToken = '';
  let adminToken = '';

  test.beforeAll(async ({ request }) => {
    customerToken = await loginRobust(request, QA.customer.email, QA.customer.password);
    adminToken = await loginRobust(request, QA.admin.email, QA.admin.password);
  });

  test('dashboard sidebar visible with groups; collapse hides labels, expand restores', async ({ page }) => {
    await injectAuth(page, customerToken);
    await page.goto(`${UI}/?page=dashboard`);

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(page.getByText('My Activity', { exact: true })).toBeVisible();
    await expect(page.getByText('Finance', { exact: true })).toBeVisible();
    await expect(page.getByText('Account', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'KYC Verification' })).toBeVisible();

    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(page.getByText('KYC Verification', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await expect(page.getByText('KYC Verification', { exact: true })).toBeVisible();
  });

  test('home, profiles, dashboard, admin have no horizontal overflow', async ({ page }) => {
    await page.goto(`${UI}/`);
    await expectNoHorizontalOverflow(page);

    await page.goto(`${UI}/?page=profiles`);
    await expectNoHorizontalOverflow(page);

    await injectAuth(page, customerToken);
    await page.goto(`${UI}/?page=dashboard`);
    await expectNoHorizontalOverflow(page);

    await injectAuth(page, adminToken);
    await page.goto(`${UI}/?page=admin`);
    await expectNoHorizontalOverflow(page);
  });
});
