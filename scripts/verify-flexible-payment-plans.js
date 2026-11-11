import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const screenshotsDir = path.resolve(
  'C:/Users/rammo/.gemini/antigravity/brain/70f13134-b9d5-4c6f-86c5-d400bdf9aa43/scratch/screenshots/flexible-audit'
);
fs.mkdirSync(screenshotsDir, { recursive: true });

function makeToken(user) {
  const secret = process.env.SESSION_SECRET || 'vib-platform-production-fallback-secret-2026';
  const data = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status || 'active',
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    iat: Date.now(),
  };
  const json = JSON.stringify(data);
  const b64 = Buffer.from(json).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const db = new DatabaseSync('data/vib.db');

const commListing = db.prepare('SELECT id FROM listings WHERE id = ?').get('lst_comm_test_01');
if (!commListing) {
  db.prepare(`
    INSERT INTO listings (id, user_id, seller_name, seller_role, title, description, price_inr, rank, region, guarantee_type, status, created_at, updated_at)
    VALUES ('lst_comm_test_01', 'usr_bfafac0357170e62', 'Community Trader', 'user', 'Community Marketplace Listing - Plat 2 Smurf', 'Public community listing without lifetime warranty.', 1800, 'Platinum 2', 'ap', 'standard', 'published', datetime('now'), datetime('now'))
  `).run();
}

const guarListing = db.prepare('SELECT id FROM listings WHERE id = ?').get('lst_b36db25ef12f');
if (guarListing) {
  db.prepare("UPDATE listings SET guarantee_type = 'lifetime_guaranteed' WHERE id = ?").run('lst_b36db25ef12f');
}

const testUser = db.prepare("SELECT * FROM users WHERE email = 'customer_test@vib.gg'").get();
const adminUser = db.prepare("SELECT * FROM users WHERE email = 'admin@vib.gg'").get();
if (!testUser || !adminUser) {
  throw new Error('Missing customer_test@vib.gg or admin@vib.gg seed user in data/vib.db');
}

const userToken = makeToken(testUser);
const adminToken = makeToken(adminUser);
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const now = new Date().toISOString();

db.prepare(`INSERT OR REPLACE INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`).run(
  userToken,
  testUser.id,
  expiresAt,
  now
);
db.prepare(`INSERT OR REPLACE INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`).run(
  adminToken,
  adminUser.id,
  expiresAt,
  now
);

console.log('Database state and active test sessions initialized.');

async function fillCheckoutAndSubmit(page, opts) {
  const { riotIdRequired, expectAgreementTitle } = opts;

  await page.locator('text="Complete Your Flexible Plan Checkout"').waitFor({ timeout: 5000 });
  await page.locator('text="Order & Plan Summary"').waitFor({ timeout: 5000 });
  await page.locator('text="Order Details"').first().waitFor({ timeout: 5000 });
  await page.locator('text="Customer Info"').waitFor({ timeout: 5000 });
  await page.locator('text="Why These Documents Are Required"').waitFor({ timeout: 5000 });
  await page.locator('text="5. Review Application Details"').waitFor({ timeout: 5000 });
  await page.locator(`text=${expectAgreementTitle}`).waitFor({ timeout: 5000 });

  // Fill fields using explicit labels/placeholders
  await page.locator('input[placeholder="e.g., Rohan Sharma"]').fill('Rohan Sharma');
  await page.locator('input[type="date"]').fill('1999-04-18');
  await page.locator('input[placeholder="e.g., rohan@vib.gg"]').fill('customer_test@vib.gg');
  await page.locator('input[placeholder="e.g., +91 98765 43210"]').fill('+91 80996 41606');
  if (riotIdRequired) {
    await page.locator('input[placeholder*="TenZ#NA1"]').fill('RohanTest#IND');
  }
  await page.locator('input[placeholder*="Flat / House No."]').fill('42B Cyber Heights, Baner');
  await page.locator('input[placeholder="e.g., Mumbai"]').fill('Pune');
  await page.locator('input[placeholder="e.g., Maharashtra"]').fill('Maharashtra');
  await page.locator('input[placeholder="e.g., 400001"]').fill('411045');

  await page.locator('input[placeholder="e.g., 5544-3322-1100"]').fill('5544-9988-7766');
  await page.locator('input[placeholder="e.g., ABCDE1234F"]').fill('ROHAN9988K');

  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles({
    name: 'aadhaar_front.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  });
  await fileInputs.nth(1).setInputFiles({
    name: 'pan_card.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  });
  await page.waitForTimeout(300);

  // Check declarations BEFORE signature to test signature validation message
  const checkboxes = page.locator('input[type="checkbox"]');
  const cbCount = await checkboxes.count();
  for (let i = 0; i < cbCount; i++) {
    await checkboxes.nth(i).check();
  }

  const submitBtn = page.locator('button[type="submit"]:has-text("Submit Application"):visible').first();
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
  await page.locator('text=Please provide your electronic signature before submitting.').waitFor({ timeout: 3000 });

  // Now generate signature and submit
  await page.locator('button:has-text("Generate Signature")').scrollIntoViewIfNeeded();
  await page.locator('button:has-text("Generate Signature")').click();
  await page.waitForTimeout(200);
  await page.locator('text=Signed & Accepted').waitFor({ timeout: 3000 });

  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
}

async function runVerification() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const serverErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('response', (res) => {
    if (res.status() >= 500) {
      serverErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('vib_auth_token', token);
    localStorage.setItem('vib_user', JSON.stringify(user));
    localStorage.setItem('vib_cookie_consent', 'all');
  }, { token: userToken, user: testUser });

  console.log('\n--- TEST 1: Homepage Entry, VP Page WhatsApp Redirect & Zero Discord Popup ---');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('button:has-text("Browse Payment Plans")').first().click();
  await page.waitForTimeout(600);
  if (!page.url().includes('/flexible-payment-plans')) {
    throw new Error(`Expected Homepage Browse Payment Plans button to open /flexible-payment-plans, got: ${page.url()}`);
  }

  await page.goto('http://localhost:3000/?page=vp', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.__openedUrls = [];
    window.open = (url) => {
      window.__openedUrls.push(String(url));
      return null;
    };
  });

  const oldWaLinks = await page.locator('a[href*="9181801766"], a[href*="8076612143"], a[href*="9999999999"]').count();
  if (oldWaLinks > 0) {
    throw new Error(`Found ${oldWaLinks} deprecated WhatsApp links on ?page=vp!`);
  }
  const newWaLinks = await page.locator('a[href*="918099641606"]').count();
  if (newWaLinks < 1) {
    throw new Error('Expected at least 1 WhatsApp link pointing to 918099641606 on ?page=vp');
  }

  const viewFaqBtn = page.locator('button:has-text("View FAQ")').first();
  await viewFaqBtn.scrollIntoViewIfNeeded();
  await viewFaqBtn.click();
  await page.waitForTimeout(300);

  if (await page.locator('text="VIB Discord Lounge"').isVisible()) {
    throw new Error('VIB Discord Lounge modal opened instead of redirecting to WhatsApp!');
  }
  const openedUrls = await page.evaluate(() => window.__openedUrls || []);
  if (!openedUrls.some((u) => u.includes('wa.me/918099641606'))) {
    throw new Error(`Expected support trigger to open https://wa.me/918099641606, got: ${JSON.stringify(openedUrls)}`);
  }
  console.log('[PASS] Test 1 PASSED.');

  console.log('\n--- TEST 2: VP Page -> Dedicated Product Page & Isolation (Desktop + 375px) ---');
  const checkPlansBtn = page.locator('button:has-text("CLICK HERE TO CHECK PLANS")').first();
  await checkPlansBtn.scrollIntoViewIfNeeded();
  await checkPlansBtn.click();
  await page.waitForTimeout(800);

  if (!page.url().includes('/flexible-payment-plans')) {
    throw new Error(`Expected navigation to /flexible-payment-plans, got: ${page.url()}`);
  }
  if ((await page.locator('[role="dialog"]').count()) > 0) {
    throw new Error('Confusing popup modal appeared instead of dedicated product page!');
  }

  await page.locator('h3:has-text("11,000 Valorant Points")').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Philippines VP")').first().click();
  await page.waitForTimeout(300);
  await page.locator('h3:has-text("13,750 PHP Region VP")').waitFor({ timeout: 5000 });
  if (await page.locator('h3:has-text("11,000 Valorant Points")').isVisible()) {
    throw new Error('Indian VP pack leaked into Philippines VP region!');
  }

  await page.locator('button:has-text("Digital Profile Flexible Plans")').first().click();
  await page.waitForTimeout(400);
  await page.locator('h3:has-text("Ascendant 3")').waitFor({ timeout: 5000 });
  if (await page.locator('text="Community Marketplace Listing"').isVisible()) {
    throw new Error('Public community marketplace listing MUST NOT appear in Digital Profile Flexible Plans!');
  }

  // Mobile responsive check on /flexible-payment-plans (375px)
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)) {
    throw new Error('Horizontal overflow detected at 375px on /flexible-payment-plans');
  }
  await page.screenshot({ path: path.join(screenshotsDir, '01-plans-mobile-375.png'), fullPage: false });
  await page.setViewportSize({ width: 1280, height: 800 });
  console.log('[PASS] Test 2 PASSED.');

  console.log('\n--- TEST 3: Community vs Guaranteed Listing Isolation (UI + Backend 403) ---');
  await page.goto('http://localhost:3000/?page=listing&id=lst_comm_test_01', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  if (await page.locator('button:has-text("Flexible Payment Plans")').isVisible()) {
    throw new Error('Flexible Payment Plans button MUST NOT appear on public community listing!');
  }

  const commApiStatus = await page.evaluate(async ({ t }) => {
    const res = await fetch('/api/emi/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({
        productTitle: 'Community Listing',
        totalAmount: 1800,
        initialPayment: 540,
        tenureMonths: 4,
        emiAmount: 428,
        serviceType: 'account',
        listingId: 'lst_comm_test_01',
      }),
    });
    return res.status;
  }, { t: userToken });
  if (commApiStatus !== 403) {
    throw new Error(`Expected backend to block Community Marketplace listing with 403, got HTTP ${commApiStatus}`);
  }

  await page.goto('http://localhost:3000/?page=listing&id=lst_b36db25ef12f', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('button:has-text("Flexible Payment Plans")').first().click();
  await page.waitForTimeout(700);
  if (!page.url().includes('/flexible-payment-plans') || !page.url().includes('listingId=lst_b36db25ef12f')) {
    throw new Error(`Expected guaranteed listing to open /flexible-payment-plans?category=account&listingId=lst_b36db25ef12f, got ${page.url()}`);
  }
  console.log('[PASS] Test 3 PASSED.');

  console.log('\n--- TEST 4: VP Plan Checkout + Agreement + Signature Persistence ---');
  await page.locator('button:has-text("VP Flexible Payment Plans")').first().click();
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Indian VP")').first().click();
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Select Plan")').first().click();
  await page.waitForTimeout(600);

  if (!page.url().includes('/flexible-checkout')) {
    throw new Error(`Expected /flexible-checkout, got: ${page.url()}`);
  }

  // Test Minor guardian trigger briefly before adult submit
  await page.locator('input[type="date"]').fill('2012-05-01');
  await page.waitForTimeout(150);
  await page.locator('text=Minor Guardian Authorization').waitFor({ timeout: 3000 });

  await fillCheckoutAndSubmit(page, {
    riotIdRequired: true,
    expectAgreementTitle: 'VP SERVICES FLEXIBLE PAYMENT PLAN AGREEMENT',
  });

  await page.waitForURL('**/flexible-confirmation**', { timeout: 10000 });
  const vpRef = await page.evaluate(() => new URLSearchParams(window.location.search).get('ref') || '');
  await page.locator('text="Application Submitted"').waitFor({ timeout: 5000 });
  await page.locator('text=services are not yet active or delivered').waitFor({ timeout: 5000 });

  const vpDbRow = db.prepare('SELECT id, status, customer_signature, service_type FROM emi_applications WHERE agreement_ref = ?').get(vpRef);
  if (!vpDbRow || !vpDbRow.customer_signature || vpDbRow.service_type !== 'vp' || vpDbRow.status !== 'pending_approval') {
    throw new Error(`VP application DB persistence mismatch for ${vpRef}: ${JSON.stringify(vpDbRow)}`);
  }
  console.log(`[PASS] Test 4 PASSED (${vpRef}, signature persisted).`);

  console.log('\n--- TEST 5: Eligible Digital Profile Checkout + Account Agreement ---');
  await page.goto('http://localhost:3000/flexible-payment-plans?category=account&listingId=lst_b36db25ef12f', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('h3:has-text("Ascendant 3")').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Select Plan")').first().click();
  await page.waitForTimeout(600);

  await fillCheckoutAndSubmit(page, {
    riotIdRequired: false,
    expectAgreementTitle: 'DIGITAL PROFILE SERVICES FLEXIBLE PAYMENT PLAN AGREEMENT',
  });

  await page.waitForURL('**/flexible-confirmation**', { timeout: 10000 });
  const accRef = await page.evaluate(() => new URLSearchParams(window.location.search).get('ref') || '');
  const accDbRow = db.prepare('SELECT id, service_type, listing_id FROM emi_applications WHERE agreement_ref = ?').get(accRef);
  if (!accDbRow || accDbRow.service_type !== 'account' || accDbRow.listing_id !== 'lst_b36db25ef12f') {
    throw new Error(`Account application DB mismatch for ${accRef}: ${JSON.stringify(accDbRow)}`);
  }
  console.log(`[PASS] Test 5 PASSED (${accRef} for lst_b36db25ef12f).`);

  console.log('\n--- TEST 6: Admin Approval (VP), Admin Rejection (Profile), & Admin Settings Live Sync ---');
  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const adminPage = await adminContext.newPage();
  await adminPage.addInitScript(({ token, user }) => {
    localStorage.setItem('vib_auth_token', token);
    localStorage.setItem('vib_user', JSON.stringify(user));
    localStorage.setItem('vib_cookie_consent', 'all');
  }, { token: adminToken, user: adminUser });

  await adminPage.goto('http://localhost:3000/?page=admin&tab=emi', { waitUntil: 'domcontentloaded' });
  await adminPage.waitForTimeout(1400);
  await adminPage.locator('text="EMI Management Console"').first().waitFor({ timeout: 5000 });

  // Reject newest (Profile app) first
  await adminPage.locator('button:has-text("Review Application")').nth(0).click();
  await adminPage.waitForTimeout(800);
  await adminPage.getByRole('button', { name: 'Reject', exact: true }).click();
  await adminPage.locator('textarea').fill('Document blurry; please re-upload clear scan.');
  await adminPage.getByRole('button', { name: 'Confirm Rejection', exact: true }).click();
  await adminPage.waitForTimeout(1000);
  await adminPage.locator('button[aria-label="Close modal"]').click();
  await adminPage.waitForTimeout(400);

  // Approve second (VP app)
  await adminPage.locator('button:has-text("Review Application")').nth(1).click();
  await adminPage.waitForTimeout(800);
  await adminPage.locator('button:has-text("View Legal Contract")').waitFor({ timeout: 5000 });
  await adminPage.locator('button:has-text("Inspect Aadhaar Card Scan")').waitFor({ timeout: 5000 });
  await adminPage.getByRole('button', { name: 'Approve Plan', exact: true }).click();
  await adminPage.waitForTimeout(1000);
  await adminPage.locator('text="Installment Schedule (4)"').waitFor({ timeout: 5000 });
  await adminPage.locator('button[aria-label="Close modal"]').click();
  await adminPage.waitForTimeout(400);

  // Admin Settings live update check
  await adminPage.locator('button:has-text("Flexible Plan Rules & Settings")').click();
  await adminPage.waitForTimeout(700);
  const vpRulesCard = adminPage.locator('.p-6').filter({ hasText: 'VP Flexible Payment Rules' }).first();
  const downPctInput = vpRulesCard.locator('input[type="number"]').nth(1);
  const origDownPct = await downPctInput.inputValue();
  const targetDownPct = origDownPct === '35' ? '32' : '35';
  await downPctInput.fill(targetDownPct);
  await adminPage.locator('button:has-text("Save VP Plan Rules")').click();
  await adminPage.locator('text=VP settings saved successfully!').waitFor({ timeout: 5000 });

  // Verify customer page immediately reflects updated Down %
  await page.goto('http://localhost:3000/flexible-payment-plans', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator(`text="${targetDownPct}% Down"`).first().waitFor({ timeout: 5000 });

  // Restore original Down Payment % cleanly
  await downPctInput.fill(origDownPct);
  await adminPage.locator('button:has-text("Save VP Plan Rules")').click();
  await adminPage.waitForTimeout(600);
  await adminContext.close();
  console.log('[PASS] Test 6 PASSED: Admin approve, reject, KYC inspect, & live settings sync verified.');

  console.log('\n--- TEST 7: Customer Dashboard Tracking, Inline Agreement & Inline Installment Pay (ZERO Popups) ---');
  await page.goto('http://localhost:3000/?page=dashboard&tab=emi', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  await page.locator('text="Flexible Payment Plans Workspace"').waitFor({ timeout: 5000 });
  await page.getByText(/My Flexible Payment Plans/i).waitFor({ timeout: 5000 });
  await page.locator('text=Document blurry; please re-upload clear scan.').first().waitFor({ timeout: 5000 });

  // Expand the approved VP plan (nth(1))
  await page.locator('button:has-text("View Plan")').nth(1).click();
  await page.waitForTimeout(700);
  await page.locator('button:has-text("View Agreement")').first().click();
  await page.waitForTimeout(300);
  await page.locator('iframe[title*="Agreement"]').first().waitFor({ timeout: 5000 });

  // Click Pay -> MUST open inline panel (ZERO fixed modal dialog!)
  await page.getByRole('button', { name: 'Pay', exact: true }).first().click();
  await page.waitForTimeout(300);
  if ((await page.locator('[role="dialog"]').count()) > 0) {
    throw new Error('Modal dialog opened when clicking Pay in EmiSection!');
  }
  await page.locator('text=Submit Payment for Installment #1').waitFor({ timeout: 5000 });
  const dashUtr = String(Date.now()).slice(-12).padStart(12, '5');
  await page.locator('input[placeholder="e.g. 402137896541"]').fill(dashUtr);
  await page.locator('input[type="file"]').last().setInputFiles({
    name: 'emi_installment_1.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(screenshotsDir, '02-dashboard-inline-pay.png'), fullPage: false });
  await page.getByRole('button', { name: 'Submit Payment', exact: true }).click();
  await page.locator('text=Payment for installment #1 submitted').waitFor({ timeout: 8000 });
  console.log('[PASS] Test 7 PASSED: Customer dashboard renders inline agreement & inline payment without popups.');

  console.log('\n--- TEST 8: Advertisement Plan Flow Regression Check ---');
  await page.goto('http://localhost:3000/?page=advertise', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const adBtn = page.getByRole('button', { name: /View Package|BUY NOW|Select Package/i }).first();
  await adBtn.click();
  await page.waitForTimeout(500);
  if (!page.url().includes('/advertise/product')) {
    throw new Error(`Expected /advertise/product URL, got: ${page.url()}`);
  }
  console.log('[PASS] Test 8 PASSED.');

  await browser.close();

  if (serverErrors.length > 0) {
    throw new Error(`HTTP 5xx errors detected:\n${serverErrors.join('\n')}`);
  }
  if (consoleErrors.length > 0) {
    throw new Error(`Uncaught page errors detected:\n${consoleErrors.join('\n')}`);
  }
  console.log('\nALL FLEXIBLE PAYMENT PLAN AUDIT CHECKS PASSED WITH ZERO POPUPS OR ERRORS.');
}

runVerification().catch((err) => {
  console.error('\n[TEST SUITE FAILURE]:', err);
  process.exit(1);
});
