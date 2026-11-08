import { test, expect } from '@playwright/test';
import { api, login, QA, injectAuth } from '../helpers/api';

/**
 * security.spec.ts — harmless, non-destructive security probes.
 *
 * All probes are read-only or use disposable test data. Actual behaviors that
 * deviate from the desired baseline are recorded as annotations and reported in
 * README.md (app code is NOT modified).
 */

test.describe('SQL injection probes', () => {
  test('login endpoint rejects SQL injection payload without 500/data leak', async ({ request }) => {
    const r = await api(request, 'POST', '/api/auth/login', { email: "' OR 1=1 --", password: 'whatever' });
    expect(r.status, 'injection must not succeed and must not 500').toBeLessThan(500);
    expect(r.status, 'injection must not authenticate').not.toBe(200);
    test.info().annotations.push({
      type: 'note',
      description: `POST /api/auth/login with "' OR 1=1 --" -> ${r.status} (parameterized query; no leak).`,
    });
  });

  test('products search API tolerates SQL injection without crashing', async ({ request }) => {
    const r = await api(request, 'GET', `/api/products?search=${encodeURIComponent("' OR 1=1 --")}`);
    expect(r.status).toBe(200);
    expect(r.data).not.toBeNull();
  });
});

test.describe('XSS reflection probes', () => {
  test('products search API does not reflect raw <script> in JSON', async ({ request }) => {
    const payload = '<script>alert(1)</script>';
    const r = await api(request, 'GET', `/api/products?search=${encodeURIComponent(payload)}`);
    expect(r.status).toBe(200);
    const raw = JSON.stringify(r.data);
    expect(raw).not.toContain('<script>');
    expect(raw).not.toContain('<img');
  });

  test('profiles search input escapes injected markup and fires no alert dialog', async ({ page }) => {
    let dialogFired = false;
    page.on('dialog', (d) => {
      dialogFired = true;
      void d.dismiss();
    });

    await page.goto('/');
    const search = page.getByLabel('Search profiles and services');
    await expect(search).toBeVisible();
    await search.fill('<img src=x onerror=alert(1)>');
    await search.press('Enter');

    // Navigated to /?page=profiles and the search value is kept as literal text.
    await expect(page).toHaveURL(/page=profiles/);
    await expect(search).toHaveValue('<img src=x onerror=alert(1)>');
    // Give any (broken) innerHTML/onerror path a chance to fire.
    await page.waitForTimeout(500);
    expect(dialogFired, 'no alert dialog may fire from the search payload').toBe(false);
  });
});

test.describe('Path traversal probes', () => {
  test('traversal attempts are blocked with 4xx (no 500)', async ({ request }) => {
    const probes = [
      ['GET', '/api/orders/track/../../etc/passwd'],
      ['GET', '/uploads/../server/index.ts'],
      ['GET', '/api/uploads/..%2F..%2Fserver%2Findex.ts'],
    ];
    for (const [method, path] of probes as Array<['GET', string]>) {
      const r = await api(request, method, path);
      expect([400, 403, 404], `${path} should be blocked with 4xx, got ${r.status}`).toContain(r.status);
    }
  });
});

test.describe('File upload / KYC size validation', () => {
  test('upload rejects non-data-URL image with 400', async ({ request }) => {
    const r = await api(request, 'POST', '/api/upload', { image: 'not-a-data-url' });
    expect(r.status).toBe(400);
  });

  test('upload rejects declared-PNG data URL whose bytes are not PNG (magic-byte check)', async ({ request }) => {
    const r = await api(request, 'POST', '/api/upload', { image: 'data:image/png;base64,PD94bWwgaHRtbD4=' });
    expect(r.status, 'fake png must be sniffed and rejected with 400').toBe(400);
  });

  test('KYC submit rejects oversized document (>5MB) with 400', async ({ request }) => {
    // Use a freshly registered user so a pre-existing pending KYC submission
    // (409) cannot mask the size-limit check (400).
    const email = `qa_kyc_big_${Date.now()}@vib.test`;
    const reg = await api(request, 'POST', '/api/auth/register', {
      name: 'KYC Size Probe',
      email,
      password: 'QaPass#123',
      terms_accepted: true,
    });
    expect(reg.status, 'test user registration should succeed').toBe(201);
    const token = (reg.data as any).token as string;

    // ~6.5MB of base64 payload decodes to >5MB -> size-limit rejection.
    const bigDataUrl = 'data:image/png;base64,' + 'A'.repeat(Math.ceil((6.5 * 1024 * 1024 * 4) / 3));
    const r = await api(request, 'POST', '/api/kyc/submit', {
      fullName: 'Security Probe',
      idType: 'aadhaar',
      idNumber: '123456789012',
      documents: [{ label: 'front', dataUrl: bigDataUrl }],
    }, token);
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.data)).toMatch(/5MB|size limit/i);
  });
});

test.describe('Rate limiting observation', () => {
  test('rapid wrong-password attempts trigger 429 after threshold; correct login resets', async ({ request }) => {
    const statuses = new Set<number>();
    for (let i = 0; i < 30; i++) {
      const r = await api(request, 'POST', '/api/auth/login', { email: QA.customer.email, password: 'wrong-pass' });
      statuses.add(r.status);
    }
    expect(statuses.has(429), 'rate limiter should return 429 after repeated failures').toBe(true);
    expect(statuses.has(200)).toBe(false);

    // A correct login clears the limiter for this IP (keeps the suite isolated).
    const ok = await api(request, 'POST', '/api/auth/login', { email: QA.customer.email, password: QA.customer.password });
    expect(ok.status).toBe(200);
  });
});

test.describe('Password reset token security', () => {
  test('reset with wrong OTP must fail with 400', async ({ request }) => {
    const forgot = await api(request, 'POST', '/api/auth/forgot-password', { email: QA.customer.email });
    if (forgot.status >= 500 || forgot.status === 503) {
      test.info().annotations.push({
        type: 'note',
        description: `Forgot-password unconfigured on this server (${forgot.status}); skipping reset-OTP check.`,
      });
      test.skip(true, 'forgot-password endpoint disabled/unconfigured');
      return;
    }
    expect(forgot.status).toBe(200);

    const wrongOtp = await api(request, 'POST', '/api/auth/reset-password', {
      email: QA.customer.email,
      code: '000000',
      newPassword: 'NewPass#123',
    });
    expect(wrongOtp.status).toBe(400);
  });
});

test.describe('Admin route protection (UI)', () => {
  test('customer token cannot open the admin console page', async ({ page, request }) => {
    const token = await login(request, QA.customer.email, QA.customer.password);
    await injectAuth(page, token);
    await page.goto('/?page=admin');

    await expect(page.getByRole('heading', { name: 'VIB Platform Admin Console' })).toHaveCount(0);
    await expect(page.locator('#dashboard-content')).toBeVisible();
    await expect(page).toHaveURL(/page=dashboard/);
  });
});

test.describe('Sensitive information exposure', () => {
  test('admin users list does not expose password_hash or salt', async ({ request }) => {
    const token = await login(request, QA.admin2.email, QA.admin2.password);
    const r = await api(request, 'GET', '/api/admin/users', undefined, token);
    expect(r.status).toBe(200);
    const users = (r.data?.users as any[]) || [];
    expect(users.length).toBeGreaterThan(0);
    for (const u of users) {
      expect(u, 'admin user row must not expose credential material').not.toHaveProperty('password_hash');
      expect(u).not.toHaveProperty('salt');
      expect(u).not.toHaveProperty('password');
    }
  });

  test('user KYC payload exposes only filenames, not document data URLs', async ({ request }) => {
    const token = await login(request, QA.customer.email, QA.customer.password);
    const r = await api(request, 'GET', '/api/user/kyc', undefined, token);
    expect(r.status).toBe(200);
    const raw = JSON.stringify(r.data);
    expect(raw).not.toContain('data:image');
    expect(raw).not.toContain('base64,');
  });

  test('user orders payload exposes no payment-evidence base64', async ({ request }) => {
    const token = await login(request, QA.customer2.email, QA.customer2.password);
    const r = await api(request, 'GET', '/api/user/orders', undefined, token);
    expect(r.status).toBe(200);
    const raw = JSON.stringify(r.data);
    expect(raw).not.toContain('base64,');
    expect(raw).not.toContain('data:image');
    expect(raw).not.toContain('blob:');
  });
});
