import { test, expect, Page } from '@playwright/test';
import { QA, injectAuth, login } from '../helpers/api';

/**
 * auth.spec.ts — Login / Register / auth flows (UI + API)
 *
 * Uses stable selectors only (role / label / placeholder), falls back to text
 * where needed. Tests are independent, fast, and deterministic.
 */

async function openSignup(page: Page) {
  await page.getByRole('button', { name: 'Sign Up' }).first().click();
  await expect(page.getByRole('heading', { name: 'CREATE VIB ACCOUNT' })).toBeVisible();
}

async function fillSignup(page: Page, opts: { name: string; email: string; password: string }) {
  await page.getByPlaceholder('e.g. Alex Mercer').fill(opts.name);
  await page.getByPlaceholder('you@email.com').fill(opts.email);
  await page.getByPlaceholder('Min. 8 characters').fill(opts.password);
  await page.getByPlaceholder('Re-enter password').fill(opts.password);
}

/**
 * The signup inputs use native HTML `required`/`type=email` constraints, which
 * make the browser block submission before the app's own validation runs.
 * Removing them lets us exercise the application-level validation messages.
 */
async function disableNativeValidation(page: Page) {
  await page.getByRole('dialog').locator('input').evaluateAll((els) => {
    for (const el of els) {
      const input = el as HTMLInputElement;
      if (input.type === 'checkbox') continue; // keep the terms checkbox as-is
      el.removeAttribute('required');
      if (input.type === 'email') el.setAttribute('type', 'text');
    }
  });
}

async function openLogin(page: Page) {
  await page.getByRole('button', { name: 'Login' }).first().click();
  await expect(page.getByRole('heading', { name: 'ACCESS ACCOUNT PORTAL' })).toBeVisible();
}

test.describe('Registration', () => {
  test('register with new unique email succeeds; token stored in localStorage', async ({ page }) => {
    const email = `qa_new_${Date.now()}@vib.test`;
    const name = `RegUser${Date.now()}`;

    await page.goto('/');
    await openSignup(page);
    await fillSignup(page, { name, email, password: 'QaPass#123' });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create Free Account' }).click();

    // Modal closes after success; header displays the new user's name.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('vib_auth_token'));
    expect(token).toBeTruthy();
  });

  test('register duplicate email shows "already exists" error', async ({ page }) => {
    await page.goto('/');
    await openSignup(page);
    await fillSignup(page, { name: 'Dup User', email: QA.customer.email, password: 'QaPass#123' });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create Free Account' }).click();

    await expect(page.getByRole('alert')).toContainText(/already exists/i);
  });

  test('register with missing name shows validation error', async ({ page }) => {
    await page.goto('/');
    await openSignup(page);
    await fillSignup(page, { name: '', email: `qa_noname_${Date.now()}@vib.test`, password: 'QaPass#123' });
    await disableNativeValidation(page);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create Free Account' }).click();

    await expect(page.getByRole('alert')).toContainText(/Full name is required/i);
  });

  test('register with invalid email format shows error', async ({ page }) => {
    await page.goto('/');
    await openSignup(page);
    // "bad@nodomain" passes the browser's type=email constraint but fails the
    // app/API regex (missing dot in domain) -> server-side validation error.
    await fillSignup(page, { name: 'Bad Email', email: 'bad@nodomain', password: 'QaPass#123' });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create Free Account' }).click();

    await expect(page.getByRole('alert')).toContainText(/invalid email address/i);
  });

  test('register with short password (<8) shows error', async ({ page }) => {
    await page.goto('/');
    await openSignup(page);
    await fillSignup(page, { name: 'Short Pass', email: `qa_short_${Date.now()}@vib.test`, password: 'short' });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create Free Account' }).click();

    await expect(page.getByRole('alert')).toContainText(/at least 8 characters/i);
  });
});

test.describe('Login / Logout', () => {
  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/');
    await openLogin(page);
    await page.getByPlaceholder('name@domain.com').fill(QA.customer.email);
    await page.getByPlaceholder('Enter your password').fill('DefinitelyWrong123');
    await page.getByRole('button', { name: 'Sign In To Platform' }).click();

    await expect(page.getByRole('alert')).toContainText(/Invalid email or password/i);
  });

  test('login with correct existing customer succeeds', async ({ page }) => {
    await page.goto('/');
    await openLogin(page);
    await page.getByPlaceholder('name@domain.com').fill(QA.customer.email);
    await page.getByPlaceholder('Enter your password').fill(QA.customer.password);
    await page.getByRole('button', { name: 'Sign In To Platform' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Logout/ })).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('vib_auth_token'));
    expect(token).toBeTruthy();
  });

  test('logout clears session and removes token from localStorage', async ({ page }) => {
    await page.goto('/');
    await openLogin(page);
    await page.getByPlaceholder('name@domain.com').fill(QA.customer.email);
    await page.getByPlaceholder('Enter your password').fill(QA.customer.password);
    await page.getByRole('button', { name: 'Sign In To Platform' }).click();
    await expect(page.getByRole('button', { name: /Logout/ })).toBeVisible();

    await page.getByRole('button', { name: /Logout/ }).click();

    await expect(page.getByRole('button', { name: 'Login' }).first()).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('vib_auth_token'));
    expect(token).toBeNull();
  });
});

test.describe('Route protection & session', () => {
  test('unauthorized page access: logged-out user on /?page=dashboard is redirected off dashboard', async ({ page }) => {
    await page.goto('/?page=dashboard');

    // Home (login prompt) shows; dashboard content must NOT.
    await expect(page.getByRole('button', { name: 'Login' }).first()).toBeVisible();
    await expect(page.locator('#dashboard-content')).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });

  test('session: authenticated user with injected token sees dashboard', async ({ page, request }) => {
    const token = await login(request, QA.customer.email, QA.customer.password);
    await injectAuth(page, token);
    await page.goto('/?page=dashboard');

    await expect(page.locator('#dashboard-content')).toBeVisible();
    await expect(page).toHaveURL(/page=dashboard/);
  });
});

test.describe('Forgot password', () => {
  test('forgot password submits and shows defined feedback (success OTP or clear error)', async ({ page }) => {
    // SMTP delivery can occasionally be slow on this stack; allow extra time.
    test.setTimeout(120_000);
    await page.goto('/');
    await openLogin(page);
    await page.getByRole('button', { name: 'Forgot Password?' }).click();
    await expect(page.getByRole('heading', { name: 'PASSWORD RECOVERY' })).toBeVisible();

    await page.getByPlaceholder('name@domain.com').fill(QA.customer.email);
    await page.getByRole('button', { name: 'Send Recovery Code' }).click();

    // Accept either success feedback (OTP sent) or a defined error when the
    // email provider is not configured — never a silent hang.
    await expect(async () => {
      // NOTE: textContent() auto-waits for an element to appear, so we must
      // guard with count() first (absence must not block the poll).
      const statusEl = page.getByRole('status');
      const alertEl = page.getByRole('alert');
      const sText = (await statusEl.count()) ? (await statusEl.textContent()) : '';
      const eText = (await alertEl.count()) ? (await alertEl.textContent()) : '';
      const hasCodeStep = (await page.getByPlaceholder('Enter 6-digit OTP or paste code').count()) > 0;
      const ok = /recovery code|sent|instructions/i.test(sText || '');
      const err = /not configured|deliver|support|failed/i.test(eText || '');
      expect(ok || err || hasCodeStep, `no feedback after forgot-password (status=${sText || 'none'}, alert=${eText || 'none'})`).toBeTruthy();
    }).toPass({ timeout: 75_000 });
  });
});
