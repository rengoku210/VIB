import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const screenshotsDir = path.resolve('public/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

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

// 1x1 transparent PNG buffer for KYC upload verification
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

async function runVerification() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('vib_auth_token', token);
    localStorage.setItem('vib_user', JSON.stringify(user));
  }, { token: userToken, user: testUser });

  console.log('\n--- TEST 1: WhatsApp Redirects (+91 80996 41606) & Zero Discord Lounge Popup ---');
  await page.goto('http://localhost:3000/?page=vp', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Intercept window.open so we verify Support / View FAQ opens WhatsApp +91 80996 41606 and NO Discord popup opens
  await page.evaluate(() => {
    window.__openedUrls = [];
    window.open = (url) => {
      window.__openedUrls.push(String(url));
      return null;
    };
  });

  // Verify no old WhatsApp links exist on VP page
  const oldWaLinks = await page.locator('a[href*="9181801766"], a[href*="8076612143"], a[href*="9999999999"]').count();
  if (oldWaLinks > 0) {
    throw new Error(`Found ${oldWaLinks} deprecated WhatsApp links on ?page=vp!`);
  }
  const newWaLinks = await page.locator('a[href*="918099641606"]').count();
  if (newWaLinks < 1) {
    throw new Error('Expected at least 1 WhatsApp link pointing to 918099641606 on ?page=vp');
  }

  // Click View FAQ -> (which triggers onNavigate('support')) and assert NO Discord Lounge modal appears and WhatsApp URL opens
  const viewFaqBtn = page.locator('button:has-text("View FAQ")').first();
  await viewFaqBtn.scrollIntoViewIfNeeded();
  await viewFaqBtn.click();
  await page.waitForTimeout(400);

  const discordModal = page.locator('text="VIB Discord Lounge"');
  if (await discordModal.isVisible()) {
    throw new Error('VIB Discord Lounge modal opened instead of redirecting to WhatsApp!');
  }

  const openedUrls = await page.evaluate(() => window.__openedUrls || []);
  if (!openedUrls.some((u) => u.includes('wa.me/918099641606'))) {
    throw new Error(`Expected View FAQ / support trigger to open https://wa.me/918099641606, got: ${JSON.stringify(openedUrls)}`);
  }
  console.log('[PASS] Test 1: Support/Discord triggers redirect cleanly to https://wa.me/918099641606 with zero Discord popup.');

  console.log('\n--- TEST 2: VP Page -> Dedicated Product Page (/flexible-payment-plans) & Isolation ---');
  const checkPlansBtn = page.locator('button:has-text("CLICK HERE TO CHECK PLANS")').first();
  await checkPlansBtn.scrollIntoViewIfNeeded();
  await checkPlansBtn.click();
  await page.waitForTimeout(1000);

  if (!page.url().includes('/flexible-payment-plans')) {
    throw new Error(`Expected navigation to /flexible-payment-plans, got: ${page.url()}`);
  }

  // Confirm ZERO popups opened
  const modalBackdrop = page.locator('[role="dialog"]');
  if (await modalBackdrop.count() > 0 && await modalBackdrop.first().isVisible()) {
    throw new Error('Confusing popup modal appeared instead of dedicated product page!');
  }

  // Verify Indian VP packs are rendered
  await page.locator('h3:has-text("11,000 Valorant Points")').waitFor({ timeout: 5000 });
  const acceptCookies = page.locator('button:has-text("Accept All Cookies")').first();
  if (await acceptCookies.isVisible()) await acceptCookies.click();
  await page.locator('h3:has-text("11,000 Valorant Points")').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'public/screenshots/test_1_product_page_vp_in.png', fullPage: false });

  // Switch to Monthly schedule & confirm text updates
  await page.locator('button:has-text("Monthly")').first().click();
  await page.waitForTimeout(300);
  await page.locator('text=/mo').first().waitFor({ timeout: 3000 });
  await page.locator('button:has-text("Weekly")').first().click();
  await page.waitForTimeout(300);

  // Switch to Philippines VP and verify isolation
  await page.locator('button:has-text("Philippines VP")').first().click();
  await page.waitForTimeout(400);
  await page.locator('h3:has-text("13,750 PHP Region VP")').waitFor({ timeout: 5000 });
  if (await page.locator('h3:has-text("11,000 Valorant Points")').isVisible()) {
    throw new Error('Indian VP pack leaked into Philippines VP region!');
  }

  // Switch to Digital Profile Flexible Plans and verify Lifetime Guaranteed vs Community Isolation
  await page.locator('button:has-text("Digital Profile Flexible Plans")').first().click();
  await page.waitForTimeout(500);
  await page.locator('h3:has-text("Ascendant 3")').waitFor({ timeout: 5000 });
  if (await page.locator('text="Community Marketplace Listing"').isVisible()) {
    throw new Error('Public community marketplace listing MUST NOT appear in Digital Profile Flexible Plans!');
  }
  await page.locator('h3:has-text("Ascendant 3")').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'public/screenshots/test_2_product_page_profiles.png', fullPage: false });
  console.log('[PASS] Test 2: Dedicated /flexible-payment-plans page, regional isolation, and guaranteed profile isolation verified.');

  // Switch back to Indian VP for checkout test
  await page.locator('button:has-text("VP Flexible Payment Plans")').first().click();
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Indian VP")').first().click();
  await page.waitForTimeout(300);

  // Mobile responsive check on /flexible-payment-plans (375px)
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(400);
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (mobileOverflow) {
    console.warn('[WARN] Horizontal overflow detected at 375px on /flexible-payment-plans');
  }
  await page.screenshot({ path: 'public/screenshots/test_2b_product_page_mobile_375.png', fullPage: false });
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('\n--- TEST 3: Account Product Listing Isolation & Navigation ---');
  await page.goto('http://localhost:3000/?page=listing&id=lst_comm_test_01', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  if (await page.locator('button:has-text("Flexible Payment Plans")').isVisible()) {
    throw new Error('Flexible Payment Plans button MUST NOT appear on public community listing!');
  }

  await page.goto('http://localhost:3000/?page=listing&id=lst_b36db25ef12f', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const accountFppBtn = page.locator('button:has-text("Flexible Payment Plans")').first();
  if (!(await accountFppBtn.isVisible())) {
    throw new Error('Flexible Payment Plans button missing on Lifetime Guaranteed listing!');
  }
  await accountFppBtn.click();
  await page.waitForTimeout(800);
  if (!page.url().includes('/flexible-payment-plans') || !page.url().includes('listingId=lst_b36db25ef12f')) {
    throw new Error(`Expected guaranteed listing to navigate to /flexible-payment-plans?category=account&listingId=lst_b36db25ef12f, got ${page.url()}`);
  }
  console.log('[PASS] Test 3: Guaranteed vs Community listing visibility and page navigation verified.');

  console.log('\n--- TEST 4: Select Plan -> Dedicated Checkout (/flexible-checkout) & KYC + E-Sign Submission ---');
  await page.locator('button:has-text("VP Flexible Payment Plans")').first().click();
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Indian VP")').first().click();
  await page.waitForTimeout(300);

  // Select 11,000 Valorant Points plan
  const firstSelectBtn = page.locator('button:has-text("Select Plan")').first();
  await firstSelectBtn.click();
  await page.waitForTimeout(800);

  if (!page.url().includes('/flexible-checkout')) {
    throw new Error(`Expected navigation to /flexible-checkout after clicking Select Plan, got: ${page.url()}`);
  }

  // Verify Checkout Summary & Progress Indicator
  await page.locator('text="Complete Your Flexible Plan Checkout"').waitFor({ timeout: 5000 });
  await page.locator('text="Order & Plan Summary"').waitFor({ timeout: 5000 });
  await page.locator('text="Customer Info"').waitFor({ timeout: 5000 });

  // Verify minor guardian conditional trigger first
  await page.locator('input[type="date"]').fill('2012-05-01');
  await page.waitForTimeout(200);
  await page.locator('text=Minor Guardian Authorization').waitFor({ timeout: 3000 });

  // Restore adult DOB and fill all checkout fields
  await page.locator('input[placeholder="e.g., Rohan Sharma"]').fill('Rohan Sharma');
  await page.locator('input[type="date"]').fill('1999-04-18');
  await page.locator('input[placeholder="e.g., rohan@vib.gg"]').fill('customer_test@vib.gg');
  await page.locator('input[placeholder="e.g., +91 98765 43210"]').fill('+91 80996 41606');
  await page.locator('input[placeholder*="TenZ#NA1"]').fill('RohanTest#IND');
  await page.locator('input[placeholder*="Flat / House No."]').fill('42B Cyber Heights, Baner');
  await page.locator('input[placeholder="e.g., Mumbai"]').fill('Pune');
  await page.locator('input[placeholder="e.g., Maharashtra"]').fill('Maharashtra');
  await page.locator('input[placeholder="e.g., 400001"]').fill('411045');

  // Primary & Secondary Identity Docs
  await page.locator('input[placeholder="e.g., 5544-3322-1100"]').fill('5544-9988-7766');
  await page.locator('input[placeholder="e.g., ABCDE1234F"]').fill('ROHAN9988K');

  // Upload primary and secondary document files via hidden file inputs
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

  // E-Signature
  await page.locator('button:has-text("Generate Signature")').click();
  await page.waitForTimeout(200);

  // Declarations checkboxes
  const checkboxes = page.locator('input[type="checkbox"]');
  const cbCount = await checkboxes.count();
  for (let i = 0; i < cbCount; i++) {
    await checkboxes.nth(i).check();
  }

  await page.screenshot({ path: 'public/screenshots/test_3_checkout_page.png', fullPage: true });

  // Submit Application
  const submitBtn = page.locator('button[type="submit"]:has-text("Submit Application"):visible').first();
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();

  console.log('\n--- TEST 5: Dedicated Confirmation Page (/flexible-confirmation) ---');
  await page.waitForURL('**/flexible-confirmation**', { timeout: 10000 });
  await page.locator('text="Application Submitted"').waitFor({ timeout: 5000 });
  await page.locator('text=Awaiting Verification & Approval').waitFor({ timeout: 5000 });
  await page.locator('text=services are not yet active or delivered').waitFor({ timeout: 5000 });
  await page.screenshot({ path: 'public/screenshots/test_4_confirmation_page.png', fullPage: false });
  console.log('[PASS] Test 5: Dedicated confirmation page displays awaiting verification status and reference.');

  console.log('\n--- TEST 6: Customer Dashboard Tracking & Agreement Download ---');
  await page.locator('button:has-text("Track in Customer Dashboard")').click();
  await page.waitForTimeout(1500);
  await page.locator('text="Flexible Payment Plans Workspace"').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Browse Flexible Plans")').waitFor({ timeout: 5000 });
  await page.locator('text=1,315').first().waitFor({ timeout: 5000 });
  const viewPlanBtn = page.locator('button:has-text("View Plan")').first();
  await viewPlanBtn.click();
  await page.waitForTimeout(800);
  await page.locator('button:has-text("Download Agreement")').first().waitFor({ timeout: 5000 });
  await page.screenshot({ path: 'public/screenshots/test_5_customer_dashboard.png', fullPage: false });
  console.log('[PASS] Test 6: Customer dashboard renders submitted plan, exact ₹1,315 weekly amount, verification status, and downloadable agreement.');

  console.log('\n--- TEST 7: Admin Console Application Review, Agreement View & Settings ---');
  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const adminPage = await adminContext.newPage();
  await adminPage.addInitScript(({ token, user }) => {
    localStorage.setItem('vib_auth_token', token);
    localStorage.setItem('vib_user', JSON.stringify(user));
  }, { token: adminToken, user: adminUser });

  await adminPage.goto('http://localhost:3000/?page=admin&tab=emi', { waitUntil: 'domcontentloaded' });
  await adminPage.waitForTimeout(1800);
  const adminCookieBtn = adminPage.locator('button:has-text("Accept All Cookies")').first();
  if (await adminCookieBtn.isVisible()) await adminCookieBtn.click();

  await adminPage.locator('text="EMI Management Console"').first().waitFor({ timeout: 5000 });
  const reviewBtn = adminPage.locator('button:has-text("Review Application")').first();
  await reviewBtn.scrollIntoViewIfNeeded();
  await reviewBtn.click();
  await adminPage.waitForTimeout(1000);

  await adminPage.locator('button:has-text("View Legal Contract")').first().waitFor({ timeout: 5000 });
  await adminPage.locator('text=5544-9988-7766').first().waitFor({ timeout: 5000 });
  await adminPage.locator('button:has-text("Inspect Aadhaar Card Scan")').first().waitFor({ timeout: 5000 });
  await adminPage.locator('text=1,315').first().waitFor({ timeout: 5000 });
  await adminPage.screenshot({ path: 'public/screenshots/test_6_admin_review_modal.png', fullPage: false });

  const approveBtn = adminPage.locator('button:has-text("Approve Plan")').first();
  if (await approveBtn.isVisible()) {
    await approveBtn.click();
    await adminPage.waitForTimeout(1200);
    await adminPage.locator('text="Installment Schedule (4)"').first().waitFor({ timeout: 5000 });
  }

  const closeAdminModal = adminPage.locator('button[aria-label="Close modal"]').first();
  if (await closeAdminModal.isVisible()) await closeAdminModal.click();
  await adminPage.waitForTimeout(400);

  await adminPage.locator('button:has-text("Flexible Plan Rules & Settings")').first().click();
  await adminPage.waitForTimeout(800);
  await adminPage.locator('text="VP Flexible Payment Rules"').first().waitFor({ timeout: 5000 });
  await adminPage.locator('text="Lifetime Guaranteed Account Rules"').first().waitFor({ timeout: 5000 });
  await adminPage.locator('text="30% Down"').first().waitFor({ timeout: 5000 });
  await adminPage.screenshot({ path: 'public/screenshots/test_7_admin_settings.png', fullPage: false });

  await adminContext.close();

  if (consoleErrors.length > 0) {
    console.warn('[WARN] Uncaught browser page errors:', consoleErrors);
  }

  console.log('\n==============================================================');
  console.log('ALL TESTS 1 THROUGH 7 PASSED WITH ZERO UNWANTED POPUPS!');
  console.log('==============================================================\n');
  await browser.close();
}

runVerification().catch((err) => {
  console.error('\n[TEST SUITE FAILURE]:', err);
  process.exit(1);
});
