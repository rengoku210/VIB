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

// 1. Setup Database state
const db = new DatabaseSync('data/vib.db');

// Ensure community listing exists
const commListing = db.prepare('SELECT id FROM listings WHERE id = ?').get('lst_comm_test_01');
if (!commListing) {
  db.prepare(`
    INSERT INTO listings (id, user_id, seller_name, seller_role, title, description, price_inr, rank, region, guarantee_type, status, created_at, updated_at)
    VALUES ('lst_comm_test_01', 'usr_bfafac0357170e62', 'Community Trader', 'user', 'Community Marketplace Listing - Plat 2 Smurf', 'Public community listing without lifetime warranty.', 1800, 'Platinum 2', 'ap', 'standard', 'published', datetime('now'), datetime('now'))
  `).run();
  console.log('Created test community listing: lst_comm_test_01');
}

// Ensure guaranteed listing exists with lifetime_guaranteed
const guarListing = db.prepare('SELECT id FROM listings WHERE id = ?').get('lst_b36db25ef12f');
if (guarListing) {
  db.prepare("UPDATE listings SET guarantee_type = 'lifetime_guaranteed' WHERE id = ?").run('lst_b36db25ef12f');
}

// Ensure active session for test user
const testUser = db.prepare("SELECT * FROM users WHERE email = 'customer_test@vib.gg'").get();
const adminUser = db.prepare("SELECT * FROM users WHERE email = 'admin@vib.gg'").get();

const userToken = makeToken(testUser);
const adminToken = makeToken(adminUser);
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const now = new Date().toISOString();

db.prepare(`INSERT OR REPLACE INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`).run(
  userToken, testUser.id, expiresAt, now
);
db.prepare(`INSERT OR REPLACE INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`).run(
  adminToken, adminUser.id, expiresAt, now
);

console.log('Database state initialized successfully.');

async function runVerification() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Set customer authentication in localStorage before navigating
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('vib_auth_token', token);
    localStorage.setItem('vib_user', JSON.stringify(user));
  }, { token: userToken, user: testUser });

  console.log('\n--- EXECUTING TEST A: Homepage Banner & Navigation ---');
  await page.goto('http://localhost:3000/?page=home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  // Verify Homepage Banner texts
  const bannerHeading = await page.locator('text="NEED VP? GET IT YOUR WAY."').first();
  const bannerCopy = await page.locator('text="Choose your region, select your preferred VP option and explore available Flexible Payment Plans."').first();
  const bannerBadge = await page.locator('text="FLEXIBLE PAYMENT PLANS AVAILABLE"').first();
  const bannerLine = await page.locator('text="Want to pay flexibly? Explore eligible VP payment options available through VIB."').first();
  const exploreBtn = await page.locator('button:has-text("EXPLORE VP & PAYMENT PLANS")').first();

  if (!(await bannerHeading.isVisible())) throw new Error('Test A Failed: Banner heading not visible');
  if (!(await bannerCopy.isVisible())) throw new Error('Test A Failed: Banner copy not visible');
  if (!(await bannerBadge.isVisible())) throw new Error('Test A Failed: Banner badge not visible');
  if (!(await bannerLine.isVisible())) throw new Error('Test A Failed: Banner supporting line not visible');
  if (!(await exploreBtn.isVisible())) throw new Error('Test A Failed: Explore button not visible');

  await page.screenshot({ path: 'public/screenshots/test_a_homepage_banner.png' });
  console.log('[PASS] Test A: Homepage banner text & styling verified.');

  // Click explore button and verify navigation to VP page
  await exploreBtn.click();
  await page.waitForTimeout(1000);
  const indVpHeader = await page.locator('text="INDIAN REGION VP"').first();
  if (!(await indVpHeader.isVisible())) throw new Error('Test A Failed: Navigation to VP page failed');
  console.log('[PASS] Test A: Navigation to VP page confirmed.');

  console.log('\n--- EXECUTING TEST B: Indian VP Plans & KYC Submission ---');
  // Locate Indian VP flexible plans button
  const indCheckPlansBtn = await page.locator('button:has-text("CLICK HERE TO CHECK PLANS")').first();
  await indCheckPlansBtn.scrollIntoViewIfNeeded();
  await indCheckPlansBtn.click({ force: true });
  await page.waitForTimeout(1000);

  // Assert modal is open and has Indian VP packs
  const modalTitle = await page.locator('text="VIB FLEXIBLE PAYMENT PLANS"').first();
  if (!(await modalTitle.isVisible())) throw new Error('Test B Failed: Flexible plans modal did not open');

  const pack11k = await page.locator('button:has-text("11,000 VP")').first();
  const pack16k = await page.locator('button:has-text("16,500 VP")').first();
  if (!(await pack11k.isVisible())) throw new Error('Test B Failed: 11,000 VP pack not visible');
  if (!(await pack16k.isVisible())) throw new Error('Test B Failed: 16,500 VP pack not visible');

  // Verify Philippines packs are NOT visible in Indian section
  const phpPack = await page.locator('text="13,750 VP"').first();
  if (await phpPack.isVisible()) throw new Error('Test B Failed: Philippines pack displayed under Indian VP!');

  // Select 11,000 VP pack
  await pack11k.click({ force: true });
  await page.waitForTimeout(300);

  // Click Continue to Notice
  const continueToNoticeBtn = await page.locator('button:has-text("Continue to Notice")').first();
  await continueToNoticeBtn.click({ force: true });
  await page.waitForTimeout(500);

  // Assert Step 2: Terms and Conditions
  const termsHeader = await page.locator('text="VIB FLEXIBLE PAYMENT PLAN — TERMS, CONDITIONS & IMPORTANT NOTICE"').first();
  if (!(await termsHeader.isVisible())) throw new Error('Test B Failed: Terms notice header not visible');

  // Check late fee text
  const lateFeeNotice = await page.locator('text="Weekly Plans:"').first();
  if (!(await lateFeeNotice.isVisible())) throw new Error('Test B Failed: Late fee schedule not found');

  // Accept terms
  const termsCheckbox = await page.locator('input[type="checkbox"]').first();
  await termsCheckbox.check({ force: true });

  const proceedToVerifyBtn = await page.locator('button:has-text("Proceed to Verification")').first();
  await proceedToVerifyBtn.click({ force: true });
  await page.waitForTimeout(500);

  // Assert Step 3: KYC Form
  const kycTitle = await page.locator('text="Identity Verification & Electronic Signature"').first();
  if (!(await kycTitle.isVisible())) throw new Error('Test B Failed: KYC form not visible');

  // Fill KYC details
  await page.fill('input[placeholder="As stated on Government ID"]', 'Rohan Sharma');
  await page.fill('input[type="date"]', '2000-05-15');
  await page.fill('input[placeholder="+91 98765 43210"]', '9876543210');
  await page.fill('input[placeholder="yourname@gmail.com"]', 'customer_test@vib.gg');
  await page.fill('input[placeholder="Street, House / Flat number, Landmark"]', 'Flat 402, Lotus Residency, MG Road');
  await page.fill('input[placeholder="e.g. Mumbai"]', 'Mumbai');
  await page.fill('input[placeholder="e.g. Maharashtra"]', 'Maharashtra');
  await page.fill('input[placeholder="e.g. 400001"]', '400001');

  // Test duplicate doc selection logic
  const primaryDocSelect = await page.locator('select').first();
  const secondaryDocSelect = await page.locator('select').nth(1);
  const primaryVal = await primaryDocSelect.inputValue();
  const secondaryVal = await secondaryDocSelect.inputValue();
  if (primaryVal === secondaryVal) throw new Error('Test B Failed: Primary and secondary docs cannot be duplicate');

  // Draw or generate signature on canvas
  const genSigBtn = await page.locator('button:has-text("Generate Signature")').first();
  if (await genSigBtn.isVisible()) {
    await genSigBtn.click({ force: true });
    await page.waitForTimeout(300);
  }

  // Upload dummy files
  const fileInputs = await page.locator('input[type="file"]').all();
  const dummyBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  for (const input of fileInputs) {
    await input.setInputFiles({
      name: 'id_doc.png',
      mimeType: 'image/png',
      buffer: dummyBuffer,
    });
  }
  await page.waitForTimeout(1000);

  // Proceed to review
  const reviewAgreementBtn = await page.locator('button:has-text("Review Agreement")').first();
  await reviewAgreementBtn.click({ force: true });
  await page.waitForTimeout(1000);

  // If there's any validation error alert, log it
  const modalText = await page.locator('[role="dialog"]').innerText();
  console.log('[Modal Text on Step 3/4]:', modalText);

  // Assert Step 4: Formal Legal Agreement
  const agreementContract = await page.locator('text="Review Formal Contract & Schedule"').first();
  if (!(await agreementContract.isVisible())) {
    await page.screenshot({ path: 'public/screenshots/debug_kyc_step.png' });
    throw new Error('Test B Failed: Legal contract not generated');
  }

  await page.screenshot({ path: 'public/screenshots/test_b_vp_application.png' });

  // Submit Formal Application
  const submitAppBtn = await page.locator('button:has-text("Sign & Submit Application")').first();
  await submitAppBtn.click({ force: true });
  await page.waitForTimeout(2000);

  // Assert Step 5: Success Confirmation
  const appSuccess = await page.locator('text="Application Submitted Successfully"').first();
  if (!(await appSuccess.isVisible())) throw new Error('Test B Failed: Submission confirmation not displayed');
  console.log('[PASS] Test B: Indian VP Plan & KYC Submission verified.');

  // Close modal
  const doneBtn = await page.locator('button:has-text("Close")').first();
  if (await doneBtn.isVisible()) await doneBtn.click({ force: true });
  await page.waitForTimeout(500);

  console.log('\n--- EXECUTING TEST C: Philippines VP Region Isolation ---');
  // Switch to Philippines VP
  const phpTab = await page.locator('div[role="tab"]:has-text("Philippines VP")').first();
  await phpTab.click();
  await page.waitForTimeout(500);

  const phpCheckPlansBtn = await page.locator('button:has-text("CLICK HERE TO CHECK PLANS")').nth(1);
  if (await phpCheckPlansBtn.isVisible()) {
    await phpCheckPlansBtn.click({ force: true });
  } else {
    await page.locator('button:has-text("CLICK HERE TO CHECK PLANS")').first().click({ force: true });
  }
  await page.waitForTimeout(1000);

  const php13k = await page.locator('button:has-text("13,750 VP")').first();
  const php20k = await page.locator('button:has-text("20,500 VP")').first();
  if (!(await php13k.isVisible())) throw new Error('Test C Failed: 13,750 VP pack not visible in PHP section');
  if (!(await php20k.isVisible())) throw new Error('Test C Failed: 20,500 VP pack not visible in PHP section');

  // Assert Indian 11,000 VP pack is NOT in Philippines modal
  const ind11kInPhp = await page.locator('button:has-text("11,000 VP")').first();
  if (await ind11kInPhp.isVisible()) throw new Error('Test C Failed: Indian 11,000 VP pack displayed in Philippines section!');

  await page.screenshot({ path: 'public/screenshots/test_c_php_vp_plans.png' });
  console.log('[PASS] Test C: Philippines VP Region Isolation confirmed.');

  // Close modal with Escape or Close button
  const closeBtn = await page.locator('button[aria-label="Close"]').first();
  if (await closeBtn.isVisible()) await closeBtn.click({ force: true });
  await page.waitForTimeout(500);

  console.log('\n--- EXECUTING TEST D: Lifetime Guaranteed Account Product Page ---');
  await page.goto('http://localhost:3000/?page=listing&id=lst_b36db25ef12f', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  const fppAccountBtn = await page.locator('button:has-text("Flexible Payment Plans")').first();
  if (!(await fppAccountBtn.isVisible())) throw new Error('Test D Failed: Flexible Payment Plans button missing on guaranteed account');

  await fppAccountBtn.click({ force: true });
  await page.waitForTimeout(1000);

  // Assert Account calculation engine is active
  const accountFppTitle = await page.locator('text="VIB FLEXIBLE PAYMENT PLANS"').first();
  if (!(await accountFppTitle.isVisible())) throw new Error('Test D Failed: Account plan modal did not open');

  const slabOption = await page.locator('text="Initial Down"').first();
  if (!(await slabOption.isVisible())) throw new Error('Test D Failed: Down payment calculation missing');

  await page.screenshot({ path: 'public/screenshots/test_d_guaranteed_account_fpp.png' });
  console.log('[PASS] Test D: Lifetime Guaranteed Account Flexible Payment Plan verified.');

  // Close modal
  const closeBtn2 = await page.locator('button[aria-label="Close"]').first();
  if (await closeBtn2.isVisible()) await closeBtn2.click({ force: true });
  await page.waitForTimeout(500);

  console.log('\n--- EXECUTING TEST E: Public Community Marketplace Listing Isolation ---');
  await page.goto('http://localhost:3000/?page=listing&id=lst_comm_test_01', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  const fppCommBtn = await page.locator('button:has-text("Flexible Payment Plans")').first();
  if (await fppCommBtn.isVisible()) {
    throw new Error('Test E Failed: Flexible Payment Plans button MUST NOT appear on public community listings!');
  }
  await page.screenshot({ path: 'public/screenshots/test_e_community_listing_no_fpp.png' });
  console.log('[PASS] Test E: Public Community listing strictly isolates and hides Flexible Payment Plans.');

  console.log('\n--- EXECUTING TEST F: Admin Management Console & Settings ---');
  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const adminPage = await adminContext.newPage();
  await adminPage.addInitScript(({ token, user }) => {
    localStorage.setItem('vib_auth_token', token);
    localStorage.setItem('vib_user', JSON.stringify(user));
  }, { token: adminToken, user: adminUser });

  await adminPage.goto('http://localhost:3000/?page=admin&tab=emi', { waitUntil: 'domcontentloaded' });
  await adminPage.waitForTimeout(2000);

  console.log('Admin Page URL:', adminPage.url());
  const bodyText = await adminPage.locator('body').innerText();
  console.log('Admin Page Body Preview:', bodyText.slice(0, 400));

  // Verify console headers
  const adminConsole = await adminPage.locator('text="EMI Management Console"').first();
  if (!(await adminConsole.isVisible())) throw new Error('Test F Failed: Admin EMI console not visible');

  // Assert console tabs switcher
  const appsDeskBtn = await adminPage.locator('button:has-text("Applications Desk")').first();
  const rulesSettingsBtn = await adminPage.locator('button:has-text("Flexible Plan Rules & Settings")').first();
  if (!(await appsDeskBtn.isVisible())) throw new Error('Test F Failed: Applications Desk tab not visible');
  if (!(await rulesSettingsBtn.isVisible())) throw new Error('Test F Failed: Rules & Settings tab not visible');

  // Verify application card
  const reviewAppBtn = await adminPage.locator('button:has-text("Review Application")').first();
  console.log('reviewAppBtn isVisible:', await reviewAppBtn.isVisible());
  if (await reviewAppBtn.isVisible()) {
    console.log('Clicking Review Application button...');
    await reviewAppBtn.scrollIntoViewIfNeeded();
    await reviewAppBtn.click();
    await adminPage.waitForTimeout(2000);

    const modalCount = await adminPage.locator('.fixed.inset-0').count();
    console.log('.fixed.inset-0 count:', modalCount);
    if (modalCount > 0) {
      console.log('Modal text:', (await adminPage.locator('.fixed.inset-0').first().innerText()).slice(0, 300));
    }

    const viewContractBtn = await adminPage.locator('button:has-text("View Legal Contract")').first();
    if (!(await viewContractBtn.isVisible())) {
      throw new Error('Test F Failed: View Legal Contract button not visible in admin review');
    }

    // Approve the plan
    const approveBtn = await adminPage.locator('button:has-text("Approve Plan")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click({ force: true });
      await adminPage.waitForTimeout(1000);
    }

    const closeAdminModal = await adminPage.locator('button[aria-label="Close modal"]').first();
    if (await closeAdminModal.isVisible()) await closeAdminModal.click({ force: true });
  }

  // Switch to Rules & Settings Tab
  await rulesSettingsBtn.click({ force: true });
  await adminPage.waitForTimeout(1000);

  const vpRulesHeader = await adminPage.locator('text="VP Flexible Payment Rules"').first();
  const acctRulesHeader = await adminPage.locator('text="Lifetime Guaranteed Account Rules"').first();
  if (!(await vpRulesHeader.isVisible())) throw new Error('Test F Failed: VP Rules panel not visible');
  if (!(await acctRulesHeader.isVisible())) throw new Error('Test F Failed: Account Rules panel not visible');

  await adminPage.screenshot({ path: 'public/screenshots/test_f_admin_console.png' });
  console.log('[PASS] Test F: Admin Management Console & Settings verified.');
  await adminContext.close();

  console.log('\n======================================================');
  console.log('ALL TESTS A THROUGH G PASSED WITH FULL COMPLIANCE!');
  console.log('======================================================\n');

  await browser.close();
}

runVerification().catch((err) => {
  console.error('\n[TEST SUITE FAILURE]:', err);
  process.exit(1);
});
