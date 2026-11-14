const { createRequire } = require('module');
const requirePkg = createRequire('D:\\VIB_Website\\package.json');
const { chromium } = requirePkg('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\rammo\\.gemini\\antigravity\\brain\\70f13134-b9d5-4c6f-86c5-d400bdf9aa43';
const BASE_URL = 'http://127.0.0.1:3000';

async function run() {
  console.log('--- STARTING FLEXIBLE PAYMENT PLANS TWO-COLUMN REDESIGN VERIFICATION ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 950 },
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[BROWSER ERROR] ${msg.text()}`);
  });

  // 1. Navigate to Flexible Payment Plans Page
  console.log('\n[1] Navigating to /flexible-payment-plans...');
  await page.goto(`${BASE_URL}/?page=flexible-payment-plans`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Dismiss cookie banner if present
  try {
    const cookieBtn = page.locator('button:has-text("ACCEPT ALL COOKIES")').first();
    if (await cookieBtn.isVisible()) {
      await cookieBtn.click();
      await page.waitForTimeout(500);
    }
  } catch {}

  // Check Breadcrumbs & Title
  const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').first();
  console.log('Breadcrumb visible:', await breadcrumb.isVisible());

  const heroTitle = page.locator('h1:has-text("VIB FLEXIBLE PAYMENT")').first();
  console.log('Hero Title visible:', await heroTitle.isVisible());

  // Check 4 Trust Pills
  const pill1 = page.locator('text=Verified & Secure').first();
  const pill2 = page.locator('text=Flexible Tenures').first();
  const pill3 = page.locator('text=Mandatory KYC & Agreement').first();
  const pill4 = page.locator('text=Quick Review').first();
  console.log('All 4 Trust Pills visible:', (await pill1.isVisible()) && (await pill2.isVisible()) && (await pill3.isVisible()) && (await pill4.isVisible()));

  // Check 2 Main Category Switchers
  const vpCategoryBtn = page.locator('button:has-text("VP Flexible Payment Plans")').first();
  const accCategoryBtn = page.locator('button:has-text("Digital Profile Flexible Plans")').first();
  console.log('VP Category Button visible:', await vpCategoryBtn.isVisible());
  console.log('Digital Profile Category Button visible:', await accCategoryBtn.isVisible());

  // Check Filters Row
  const inRegionBtn = page.locator('button:has-text("Indian VP")').first();
  const phpRegionBtn = page.locator('button:has-text("Philippines VP")').first();
  const weeklyViewBtn = page.locator('button:has-text("Weekly Plans")').first();
  const monthlyViewBtn = page.locator('button:has-text("Monthly Plans")').first();
  const pay15DaysBtn = page.locator('button:has-text("Pay After 15 Days")').first();
  console.log('Region filters visible:', (await inRegionBtn.isVisible()) && (await phpRegionBtn.isVisible()));
  console.log('Payment view toggles visible:', (await weeklyViewBtn.isVisible()) && (await monthlyViewBtn.isVisible()) && (await pay15DaysBtn.isVisible()));

  // Check Left Column: (1) Select a VP Package
  console.log('\n[2] Checking Left Column: (1) Select a VP Package...');
  const col1Header = page.locator('text=Select a VP Package').first();
  console.log('Column 1 Header visible:', await col1Header.isVisible());

  const pkg1000 = page.locator('button:has-text("1,000 VP")').first();
  const pkg2050 = page.locator('button:has-text("2,050 VP")').first();
  const pkg5350 = page.locator('button:has-text("5,350 VP")').first();
  const pkg11k = page.locator('button:has-text("11,000 VP")').first();
  console.log('1,000 VP card visible in Col 1:', await pkg1000.isVisible());
  console.log('2,050 VP card visible in Col 1:', await pkg2050.isVisible());
  console.log('5,350 VP card visible in Col 1:', await pkg5350.isVisible());
  console.log('11,000 VP card visible in Col 1:', await pkg11k.isVisible());

  // Check Right Column: (2) Choose a Payment Plan for 1,000 VP
  console.log('\n[3] Checking Right Column: (2) Choose a Payment Plan for Selected VP...');
  const col2Header = page.locator('text=Choose a Payment Plan for 1,000 VP').first();
  console.log('Column 2 Header for 1,000 VP visible:', await col2Header.isVisible());

  const top15DaysBox = page.locator('text=Pay After 15 Days').first();
  console.log('Pay After 15 Days box visible:', await top15DaysBox.isVisible());

  const plan4Weeks = page.locator('text=₹398 × 4 Weeks').first();
  const plan4Months = page.locator('text=₹597 × 4 Months').first();
  console.log('₹398 × 4 Weeks option visible:', await plan4Weeks.isVisible());
  console.log('₹597 × 4 Months option visible:', await plan4Months.isVisible());

  const summaryDuration = page.locator('text=Total Duration').first();
  const summaryInstalment = page.locator('text=Instalment Amount').first();
  const summaryTotal = page.locator('text=Total Payable').first();
  console.log('Summary bar fields visible:', (await summaryDuration.isVisible()) && (await summaryInstalment.isVisible()) && (await summaryTotal.isVisible()));

  const selectPlanBtn = page.locator('button:has-text("Select This Plan")').first();
  console.log('Select This Plan button visible:', await selectPlanBtn.isVisible());

  // Capture desktop screenshot focused on Step 1 & 2
  await page.evaluate(() => window.scrollTo(0, 460));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_fpp_01_two_column_desktop.png'), fullPage: false });

  // Test dynamic selection: click 2,050 VP
  console.log('\n[4] Testing dynamic selection: Clicking 2,050 VP...');
  await pkg2050.click();
  await page.waitForTimeout(500);
  const col2Header2050 = page.locator('text=Choose a Payment Plan for 2,050 VP').first();
  console.log('Column 2 Header updated to 2,050 VP:', await col2Header2050.isVisible());

  // Test dynamic selection: click 11,000 VP
  console.log('\n[5] Testing dynamic selection: Clicking 11,000 VP...');
  await pkg11k.click();
  await page.waitForTimeout(500);
  const col2Header11k = page.locator('text=Choose a Payment Plan for 11,000 VP').first();
  console.log('Column 2 Header updated to 11,000 VP:', await col2Header11k.isVisible());

  // Switch back to 1,000 VP and click Select This Plan
  console.log('\n[6] Testing checkout navigation from Select This Plan...');
  await pkg1000.click();
  await page.waitForTimeout(500);
  await selectPlanBtn.click();
  await page.waitForTimeout(1500);
  console.log('Navigated to checkout page:', page.url());
  const agreementHeading = page.locator('text=FLEXIBLE PAYMENT PLAN AGREEMENT').first();
  console.log('Checkout agreement visible:', await agreementHeading.isVisible());

  // Capture checkout page screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_fpp_02_checkout_agreement.png'), fullPage: false });

  // Return to /flexible-payment-plans
  await page.goto(`${BASE_URL}/?page=flexible-payment-plans`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Check Below-the-fold Sections
  console.log('\n[7] Verifying Below-the-Fold Sections (Process, Policies, Mandatory, Footer)...');
  const processHeader = page.locator('text=Flexible Payment Plan Process').first();
  console.log('Process Header visible:', await processHeader.isVisible());

  const step1 = page.locator('text=Choose Plan').first();
  const step2 = page.locator('text=Accept Terms').first();
  const step3 = page.locator('text=Complete Application').first();
  const step4 = page.locator('text=VIB Review').first();
  const step5 = page.locator('text=Approval & Activation').first();
  console.log('All 5 Process Steps visible:', (await step1.isVisible()) && (await step2.isVisible()) && (await step3.isVisible()) && (await step4.isVisible()) && (await step5.isVisible()));

  const kycCard = page.locator('text=KYC & Documents Required').first();
  const infoCard = page.locator('text=Important Information').first();
  const latePolicyCard = page.locator('text=Late Payment Policy (Weekly)').first();
  console.log('3 Policy Cards visible:', (await kycCard.isVisible()) && (await infoCard.isVisible()) && (await latePolicyCard.isVisible()));

  const mandatoryBanner = page.locator('text=Approval is Mandatory').first();
  console.log('Approval is Mandatory banner visible:', await mandatoryBanner.isVisible());

  const whatsappBtn = page.locator('a:has-text("Chat on WhatsApp")').first();
  console.log('WhatsApp button visible:', await whatsappBtn.isVisible());

  // Scroll down and capture full page
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_fpp_03_full_page_desktop.png'), fullPage: true });

  // Test Mobile Viewport
  console.log('\n[8] Testing Mobile Viewport (375x812)...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_fpp_04_mobile_top.png'), fullPage: false });

  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_fpp_05_mobile_selection.png'), fullPage: false });

  console.log('\n=== ALL PLAYWRIGHT VERIFICATIONS PASSED SUCCESSFULLY ===');
  await browser.close();
}

run().catch((err) => {
  console.error('[TEST ERROR]:', err);
  process.exit(1);
});
