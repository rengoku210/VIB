import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const screenshotsDir = path.resolve(
  'C:/Users/rammo/.gemini/antigravity/brain/70f13134-b9d5-4c6f-86c5-d400bdf9aa43/scratch/screenshots'
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
const testUser = db.prepare("SELECT * FROM users WHERE email = 'customer_test@vib.gg'").get();
if (!testUser) {
  throw new Error('Missing customer_test@vib.gg seed user in data/vib.db');
}
const userToken = makeToken(testUser);
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const now = new Date().toISOString();

db.prepare(
  'INSERT OR REPLACE INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
).run(userToken, testUser.id, expiresAt, now);

async function runVerification() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const serverErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', (res) => {
    if (res.status() === 401 || res.status() >= 500) {
      serverErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('vib_auth_token', token);
      localStorage.setItem('vib_user', JSON.stringify(user));
      localStorage.setItem('vib_cookie_consent', 'all');
    },
    { token: userToken, user: testUser }
  );

  // 1. VP Packs: Click 1,000 VP -> Must open /product (ZERO modal popups)
  console.log('\n--- TEST 1: VP Card -> Dedicated Product Page (No CheckoutModal) ---');
  await page.goto('http://localhost:3000/?page=vp', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const vpCard = page
    .locator('div.group')
    .filter({ hasText: /1,000 VP/ })
    .filter({ hasText: /₹999/ })
    .first();
  await vpCard.getByRole('button', { name: 'Buy Now' }).click();
  await page.waitForTimeout(500);

  const productUrl = page.url();
  if (!productUrl.includes('/product')) {
    throw new Error(`Expected /product URL after clicking Buy Now on 1,000 VP, got: ${productUrl}`);
  }

  const popupDialogCount = await page.locator('[role="dialog"]').count();
  if (popupDialogCount > 0) {
    throw new Error(`Expected 0 modal dialogs on VP Buy Now, found ${popupDialogCount}`);
  }

  await page.getByRole('heading', { name: /1,000 VP/i }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText(/Included Deliverables/i).waitFor({ state: 'visible' });
  await page.getByText(/Important Conditions/i).waitFor({ state: 'visible' });
  await page.getByText(/Frequently Asked Questions/i).waitFor({ state: 'visible' });

  // Mobile check on /product (375px)
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  const prodOverflow375 = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2
  );
  if (prodOverflow375) {
    throw new Error('Horizontal overflow detected on /product at 375px');
  }
  await page.screenshot({ path: path.join(screenshotsDir, '01-product-mobile-375.png'), fullPage: false });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(screenshotsDir, '02-product-desktop-1280.png'), fullPage: false });
  console.log('TEST 1 PASSED: /product renders 1,000 VP dedicated product page with zero popups and clean 375px layout.');

  // 2. Product Page BUY NOW -> /checkout Stage 1 -> Stage 2 (COMPLETE YOUR PAYMENT) -> Stage 3
  console.log('\n--- TEST 2: Product BUY NOW -> Order Details -> ManualPaymentGateway -> Evidence Upload ---');
  await page.getByRole('button', { name: /BUY NOW/i }).click();
  await page.waitForTimeout(400);

  if (!page.url().includes('/checkout')) {
    throw new Error(`Expected /checkout URL after clicking BUY NOW, got: ${page.url()}`);
  }

  await page.getByRole('heading', { name: /COMPLETE YOUR ORDER/i }).waitFor({ state: 'visible', timeout: 5000 });

  await page.getByPlaceholder('Game Name (e.g. PhoenixAim)').fill('VIB_Director');
  await page.getByPlaceholder('IND1').fill('EXEC');
  await page.getByPlaceholder('you@example.com').fill('customer_test@vib.gg');

  const phoneInput = page.getByPlaceholder('+91 98765 43210');
  if ((await phoneInput.count()) > 0) {
    await phoneInput.fill('+919876543210');
  }

  await page.getByText(/Legitimate Valorant ID Verified/i).waitFor({ state: 'visible', timeout: 10000 });
  await page.screenshot({ path: path.join(screenshotsDir, '03-checkout-stage1-desktop.png'), fullPage: false });

  await page.getByRole('button', { name: /Proceed to Payment/i }).click();

  // Expect Stage 2: COMPLETE YOUR PAYMENT (ManualPaymentGateway)
  await page.getByRole('heading', { name: /COMPLETE YOUR PAYMENT/i }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(/Order Summary/i).waitFor({ state: 'visible' });
  await page.getByText(/Pay Now/i).waitFor({ state: 'visible' });

  // Mobile overflow check on payment page (375px)
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  const payOverflow375 = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2
  );
  if (payOverflow375) {
    throw new Error('Horizontal overflow detected on /checkout payment gateway at 375px');
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(screenshotsDir, '04-payment-gateway-desktop.png'), fullPage: true });

  // Upload test PNG screenshot and enter UTR
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'upi-receipt.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  });

  const dynamicUtr = String(Date.now()).slice(-12).padStart(12, '4');
  await page.getByPlaceholder('e.g. 432198765432').fill(dynamicUtr);
  await page.getByRole('button', { name: /Submit Payment for Verification/i }).click();

  // Expect Stage 3 confirmation
  await page.getByRole('heading', { name: /PAYMENT EVIDENCE SUBMITTED!/i }).waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('#main-content').getByRole('button', { name: /Track Live Order/i }).waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(screenshotsDir, '05-payment-submitted-desktop.png'), fullPage: false });
  console.log('TEST 2 PASSED: Order created, ManualPaymentGateway rendered, payment evidence & UTR submitted successfully.');

  // 3. Account Listing Detail -> Buy Account -> Directly to /checkout (no redundant product page)
  console.log('\n--- TEST 3: ListingDetailPage Buy Account -> Direct /checkout ---');
  await page.goto('http://localhost:3000/?page=listing&id=lst_b36db25ef12f', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: /Buy Account \(Escrow Protected\)/i }).click();
  await page.waitForTimeout(400);
  if (!page.url().includes('/checkout')) {
    throw new Error(`Expected /checkout directly from ListingDetailPage, got: ${page.url()}`);
  }
  await page.getByRole('heading', { name: /COMPLETE YOUR ORDER/i }).waitFor({ state: 'visible', timeout: 5000 });
  console.log('TEST 3 PASSED: ListingDetailPage Buy Account opens /checkout directly.');

  // 4. Add to Cart -> Cart Drawer Proceed -> Directly to /checkout
  console.log('\n--- TEST 4: CartDrawer Proceed to Checkout -> Direct /checkout ---');
  await page.goto('http://localhost:3000/?page=listing&id=lst_b36db25ef12f', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /Add to Shopping Cart/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Proceed to Checkout/i }).click();
  await page.waitForTimeout(400);
  if (!page.url().includes('/checkout')) {
    throw new Error(`Expected /checkout from CartDrawer, got: ${page.url()}`);
  }
  await page.getByText(/Cart Checkout:/i).first().waitFor({ state: 'visible', timeout: 5000 });
  console.log('TEST 4 PASSED: CartDrawer opens /checkout directly.');

  // 5. Rankup Quote -> Opens /product -> Proceeds to Order Creation
  console.log('\n--- TEST 5: Rankup Quote -> /product -> Order Creation ---');
  await page.goto('http://localhost:3000/?page=rankup', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const rankupBtn = page.getByRole('button', { name: /Continue to Checkout/i }).first();
  await rankupBtn.waitFor({ state: 'visible', timeout: 5000 });
  await rankupBtn.click();
  await page.waitForTimeout(400);
  if (!page.url().includes('/product')) {
    throw new Error(`Expected /product after Rankup click, got: ${page.url()}`);
  }
  await page.getByRole('button', { name: /BUY NOW/i }).click();
  await page.waitForTimeout(400);
  if (!page.url().includes('/checkout')) {
    throw new Error(`Expected /checkout after Rankup BUY NOW, got: ${page.url()}`);
  }
  await page.getByPlaceholder('Game Name (e.g. PhoenixAim)').fill('VIB_Director');
  await page.getByPlaceholder('IND1').fill('EXEC');
  await page.getByPlaceholder('you@example.com').fill('customer_test@vib.gg');
  await page.getByText(/Legitimate Valorant ID Verified/i).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByRole('button', { name: /Proceed to Payment/i }).click();
  await page.getByRole('heading', { name: /COMPLETE YOUR PAYMENT/i }).waitFor({ state: 'visible', timeout: 10000 });
  console.log('TEST 5 PASSED: Rankup quote creates order cleanly with no server error.');

  // 6. Advertisement Plan Flow Regression Check
  console.log('\n--- TEST 6: Advertisement Plan Flow Regression Check ---');
  await page.goto('http://localhost:3000/?page=advertise', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const adBuyBtn = page.getByRole('button', { name: /View Package|BUY NOW|Select Package/i }).first();
  if ((await adBuyBtn.count()) > 0) {
    await adBuyBtn.click();
    await page.waitForTimeout(500);
    if (!page.url().includes('/advertise/product')) {
      throw new Error(`Expected /advertise/product URL, got: ${page.url()}`);
    }
    console.log('TEST 6 PASSED: Advertisement Plan flow still navigates to /advertise/product cleanly.');
  }

  await browser.close();

  if (serverErrors.length > 0) {
    throw new Error(`HTTP 401/5xx errors detected:\n${serverErrors.join('\n')}`);
  }
  if (consoleErrors.length > 0) {
    throw new Error(`Console/page errors detected:\n${consoleErrors.join('\n')}`);
  }
  console.log('\nALL SERVICE PRODUCT & CHECKOUT E2E CHECKS PASSED CLEANLY WITH ZERO ERRORS.');
}

runVerification().catch((err) => {
  console.error('\nVERIFICATION FAILED:', err);
  process.exit(1);
});
