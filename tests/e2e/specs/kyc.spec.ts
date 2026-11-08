/**
 * KYC Verification — full lifecycle regression (UI + API).
 *
 * Covers:
 *   1. Initial state (API): unverified / submission null.
 *   2. Customer UI submit (form + 2 doc uploads with previews) -> Under Review.
 *   3. Admin API list sees pending submission with documents_count 2.
 *   4. Admin UI review -> approve -> chip becomes Approved.
 *   5. Customer API sees approved; resubmission blocked with 409.
 *   6. Rejection path (API submit, admin reject with reason, customer sees
 *      rejected + reason, resubmit succeeds with 201).
 *   7. Document protection: another customer's token cannot read docs (404);
 *      private KYC docs are not exposed under /uploads (404).
 *
 * NOTE ON TEST ISOLATION: the QA accounts are seeded once, so this spec
 * self-cleans KYC state for the two QA customers (via the local SQLite DB)
 * before running. This keeps the file repeatable without app changes.
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

/** Remove KYC submissions and reset profile KYC status for the given QA users. */
function resetKycState() {
  try {
    const db = new DatabaseSync(DB_PATH);
    for (const email of [QA.customer.email, QA.customer2.email, QA.seller.email]) {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
      if (!user) continue;
      db.prepare('DELETE FROM kyc_submissions WHERE user_id = ?').run(user.id);
      db.prepare("UPDATE profiles SET kyc_status = 'unverified' WHERE user_id = ?").run(user.id);
    }
    db.close();
  } catch {
    // Best-effort cleanup; if the DB is not accessible the assertions below
    // will still run and surface any drift.
  }
}

const KYC_BODY = {
  fullName: 'QA Customer KYC',
  dob: '1995-04-12',
  address: 'Mumbai, India',
  idType: 'Aadhaar Card',
  idNumber: '1234 5678 9012',
  documents: [
    { label: 'Aadhaar Front', dataUrl: pngDataUrl() },
    { label: 'Aadhaar Back', dataUrl: pngDataUrl() },
  ],
};

test.describe.configure({ mode: 'serial' });

let customerToken = '';
let customer2Token = '';
let sellerToken = '';
let adminToken = '';

test.beforeAll(async ({ request }) => {
  resetKycState();
  customerToken = await loginRobust(request, QA.customer.email, QA.customer.password);
  customer2Token = await loginRobust(request, QA.customer2.email, QA.customer2.password);
  sellerToken = await loginRobust(request, QA.seller.email, QA.seller.password);
  adminToken = await loginRobust(request, QA.admin.email, QA.admin.password);
});

test('1. initial API state is unverified with no submission', async ({ request }) => {
  const r = await api(request, 'GET', '/api/user/kyc', undefined, customerToken);
  expect(r.status).toBe(200);
  expect(r.data).toMatchObject({ kycStatus: 'unverified', submission: null });
});

test('2. customer UI submits KYC with two document previews -> Under Review', async ({ page }) => {
  await injectAuth(page, customerToken);
  await page.goto(`${UI}/?page=dashboard`);

  // Open the KYC tab from the dashboard sidebar.
  await page.getByRole('button', { name: 'KYC Verification' }).click();
  await expect(page.getByRole('heading', { name: /KYC Identity Verification/ })).toBeVisible();

  // Fill the form.
  await page.getByPlaceholder('e.g. Aarav Sharma').fill('QA Customer KYC');
  await page.locator('input[type="date"]').fill('1995-04-12');
  await page.getByPlaceholder('Full residential address').fill('Mumbai, India');
  await page.locator('select').selectOption('Aadhaar Card');
  await page.getByPlaceholder('e.g. XXXX XXXX XXXX').fill('1234 5678 9012');

  // Upload two document images; previews must appear.
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([ASSET_PATH, ASSET_PATH]);
  await expect(page.getByText(/Ready •/)).toHaveCount(2);

  await page.getByRole('button', { name: 'Submit for Verification' }).click();

  // Submission accepted -> status flips to Under Review.
  // Exact match: the transient success banner ("Submission received! ... under review.")
  // also contains the substring "Under Review", which would trip strict mode.
  await expect(page.getByText('Under Review', { exact: true })).toBeVisible();
});


test('3. admin API lists the pending submission with documents_count 2', async ({ request }) => {
  const r = await api(request, 'GET', '/api/admin/kyc/list', undefined, adminToken);
  expect(r.status).toBe(200);
  const subs = (r.data as any).submissions as any[];
  const mine = subs.find((s: any) => s.user_email === QA.customer.email);
  expect(mine).toBeTruthy();
  expect(mine.full_name).toBe('QA Customer KYC');
  expect(mine.status).toBe('pending');
  expect(mine.documents_count).toBe(2);
});

test('4. admin UI approves the submission and chip becomes Approved', async ({ page, request }) => {
  await injectAuth(page, adminToken);
  await page.goto(`${UI}/?page=admin&tab=kyc`);
  await dismissCookieBanner(page);

  const card = page.getByText('QA Customer KYC').locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
  await expect(card.getByText('pending', { exact: true })).toBeVisible();
  await expect(card.getByText(/Docs: 2/)).toBeVisible();

  await card.getByRole('button', { name: 'Review Submission' }).click();
  await expect(page.getByText(/KYC Submission/)).toBeVisible();

  const approveBtn = page.getByRole('button', { name: 'Approve', exact: true });
  await expect(approveBtn).toBeVisible();
  await approveBtn.click();
  await expect(page.getByText('Submission approved successfully.')).toBeVisible();

  // Modal closes ~900ms after success; list refreshes with the new chip.
  await expect(card.getByText('approved', { exact: true })).toBeVisible();

  // API confirms the customer-level KYC status.
  const r = await api(request, 'GET', '/api/user/kyc', undefined, customerToken);
  expect(r.status).toBe(200);
  expect((r.data as any).kycStatus).toBe('approved');
});

test('5. approved customer gets 409 on resubmission', async ({ request }) => {
  const r = await api(request, 'POST', '/api/kyc/submit', { ...KYC_BODY }, customerToken);
  expect(r.status).toBe(409);
});

test('6. rejection path: customer2 rejected with reason, resubmit succeeds', async ({ page, request }) => {
  // Submit KYC for customer2 via API.
  const c2Body = { ...KYC_BODY, fullName: 'QA Customer Two KYC', idType: 'PAN Card' };
  const submit = await api(request, 'POST', '/api/kyc/submit', c2Body, customer2Token);
  expect(submit.status).toBe(201);

  // Admin finds it and rejects with a reason.
  const list = await api(request, 'GET', '/api/admin/kyc/list', undefined, adminToken);
  const mine = ((list.data as any).submissions as any[]).find((s: any) => s.user_email === QA.customer2.email);
  expect(mine).toBeTruthy();
  expect(mine.status).toBe('pending');

  const reject = await api(request, 'PUT', `/api/admin/kyc/${mine.id}/status`, { status: 'rejected', reason: 'Test rejection' }, adminToken);
  expect(reject.status).toBe(200);

  // Customer sees rejected + reason.
  const status = await api(request, 'GET', '/api/user/kyc', undefined, customer2Token);
  expect(status.status).toBe(200);
  expect((status.data as any).kycStatus).toBe('rejected');
  expect((status.data as any).submission.rejectionReason).toBe('Test rejection');

  // UI shows the rejection banner with reason.
  await injectAuth(page, customer2Token);
  await page.goto(`${UI}/?page=dashboard`);
  await page.getByRole('button', { name: 'KYC Verification' }).click();
  await expect(page.getByText('Verification Rejected')).toBeVisible();
  await expect(page.getByText('Test rejection')).toBeVisible();

  // Resubmission succeeds (201) -> new pending submission.
  const resubmit = await api(request, 'POST', '/api/kyc/submit', c2Body, customer2Token);
  expect(resubmit.status).toBe(201);
});

test('7. documents are protected from other customers and /uploads', async ({ request }) => {
  // Get a document filename from customer1's approved submission.
  const status = await api(request, 'GET', '/api/user/kyc', undefined, customerToken);
  const docs = (status.data as any).submission.documents as { label: string; filename: string }[];
  expect(docs.length).toBeGreaterThan(0);
  const filename = docs[0].filename;

  // Another customer's token must not be able to read the document.
  const asSeller = await api(request, 'GET', `/api/user/kyc/docs/${encodeURIComponent(filename)}`, undefined, sellerToken);
  expect(asSeller.status).toBe(404);

  // The private KYC file is not served from the public /uploads directory.
  const publicUpload = await api(request, 'GET', `/uploads/${encodeURIComponent(filename)}`);
  expect(publicUpload.status).toBe(404);
});

test('8. KYC submit shows transient success confirmation (bug probe)', async ({ page }) => {
  // qa_seller is reset to unverified at the start of this file, so the submit
  // below is valid. Expected UX: after submit, a transient success confirmation
  // appears. Observed: it never renders.
  test.info().annotations.push({
    type: 'bug',
    description:
      'KYC success confirmation never displays: the "Submission received!" banner is rendered inside the form container which unmounts the moment kycStatus flips to pending (KycSection.tsx). The user receives no explicit success feedback, only the persistent "Under Review" status banner.',
  });

  await injectAuth(page, sellerToken);
  await page.goto(`${UI}/?page=dashboard`);
  await page.getByRole('button', { name: 'KYC Verification' }).click();

  const sellerBody = { ...KYC_BODY, fullName: 'QA Seller KYC' };
  await page.getByPlaceholder('e.g. Aarav Sharma').fill(sellerBody.fullName);
  await page.locator('input[type="date"]').fill(sellerBody.dob);
  await page.getByPlaceholder('Full residential address').fill(sellerBody.address);
  await page.locator('select').selectOption(sellerBody.idType);
  await page.getByPlaceholder('e.g. XXXX XXXX XXXX').fill(sellerBody.idNumber);
  await page.locator('input[type="file"]').setInputFiles([ASSET_PATH, ASSET_PATH]);
  await expect(page.getByText(/Ready •/)).toHaveCount(2);

  await page.getByRole('button', { name: 'Submit for Verification' }).click();

  // The success banner never renders (it lives inside the unmounted form).
  await expect(page.getByText(/Submission received/)).toBeVisible({ timeout: 3000 });
});
