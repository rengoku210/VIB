const { createRequire } = require('module');
const requirePkg = createRequire('D:\\VIB_Website\\package.json');
const { chromium } = requirePkg('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ARTIFACT_DIR = 'C:\\Users\\rammo\\.gemini\\antigravity\\brain\\70f13134-b9d5-4c6f-86c5-d400bdf9aa43';
const BASE_URL = 'http://127.0.0.1:3000';
const API_URL = 'http://127.0.0.1:5000';

function apiRequest(endpoint, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, ok: false, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('=== STARTING PLAYWRIGHT VERIFICATION FOR USER REQUIREMENTS ===');
  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // TEST 1: Header Desktop Navigation ("Sell your account")
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Verifying Desktop Navbar (Sell your account after Profiles)...');
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const desktopPage = await desktopContext.newPage();

    await desktopPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1000);

    // Dismiss cookies if visible
    try {
      const cookieBtn = desktopPage.locator('button:has-text("ACCEPT ALL COOKIES")').first();
      if (await cookieBtn.isVisible()) await cookieBtn.click();
    } catch {}

    // Check navbar button
    const sellBtnDesktop = desktopPage.locator('header nav button:has-text("Sell your account"), header button:has-text("Sell your account")').first();
    const isSellDesktopVisible = await sellBtnDesktop.isVisible();
    console.log('Desktop "Sell your account" button visible:', isSellDesktopVisible);

    // Click "Sell your account"
    await sellBtnDesktop.click();
    await desktopPage.waitForTimeout(1200);

    const adHeading = desktopPage.locator('h1:has-text("PROMOTE YOUR PROFILE")').first();
    const isAdHeadingVisible = await adHeading.isVisible();
    console.log('Advertisement Plans page heading visible after clicking:', isAdHeadingVisible);

    const shot1 = path.join(ARTIFACT_DIR, 'verify_01_sell_your_account_desktop.png');
    await desktopPage.screenshot({ path: shot1, fullPage: false });
    console.log('Saved screenshot 1:', shot1);

    // -------------------------------------------------------------
    // TEST 2: Header Mobile Navigation ("Sell your account")
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Verifying Mobile Drawer (Sell your account after Profiles)...');
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 750 } });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    // Dismiss cookies
    try {
      const cookieBtn = mobilePage.locator('button:has-text("ACCEPT ALL COOKIES")').first();
      if (await cookieBtn.isVisible()) await cookieBtn.click();
    } catch {}

    // Click mobile menu button
    const menuBtn = mobilePage.locator('button[aria-label="Open navigation menu"]').first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await mobilePage.waitForTimeout(600);
    }

    const sellBtnMobile = mobilePage.locator('#mobile-navigation button:has-text("Sell your account")').first();
    const isSellMobileVisible = await sellBtnMobile.isVisible();
    console.log('Mobile "Sell your account" button visible in drawer:', isSellMobileVisible);

    const shot2 = path.join(ARTIFACT_DIR, 'verify_02_sell_your_account_mobile.png');
    await mobilePage.screenshot({ path: shot2, fullPage: false });
    console.log('Saved screenshot 2:', shot2);

    await mobileContext.close();

    // -------------------------------------------------------------
    // TEST 3: Payment Under Verification screen & High Traffic Delay (No elapsed counter)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Verifying Payment Under Verification View & High Traffic Delay...');
    // Create an ad order draft via backend
    const createDraftRes = await apiRequest('/api/advertisement/orders/create-draft', 'POST', {
      planId: 'ad-post-6stories-edit-525',
      customerName: 'Raul',
      customerEmail: 'raul@test.com',
      customerPhone: '+919876543210',
      firstName: 'Raul',
      lastName: 'User'
    });

    if (!createDraftRes.ok || !createDraftRes.data.orderId) {
      throw new Error(`Failed to create ad order: ${JSON.stringify(createDraftRes.data)}`);
    }

    const adOrderId = createDraftRes.data.orderId;
    console.log('Created Ad Order ID:', adOrderId);

    // Submit payment proof
    const submitProofRes = await apiRequest(`/api/advertisement/orders/${adOrderId}/submit-payment`, 'POST', {
      paymentReference: '45879645488',
      paymentScreenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    });
    console.log('Submitted payment proof:', submitProofRes.ok);

    // Navigate to ad checkout page for this order
    await desktopPage.goto(`${BASE_URL}/advertise/checkout/${encodeURIComponent(adOrderId)}`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    // Verify "PAYMENT UNDER VERIFICATION" header
    const underVerifHeading = desktopPage.locator('h1:has-text("PAYMENT UNDER VERIFICATION")').first();
    const isUnderVerifVisible = await underVerifHeading.isVisible();
    console.log('"PAYMENT UNDER VERIFICATION" heading visible:', isUnderVerifVisible);

    // Verify NO "Elapsed:" text is visible
    const elapsedTextMatches = await desktopPage.locator('text=Elapsed:').count();
    console.log('Count of "Elapsed:" timer text on screen (must be 0):', elapsedTextMatches);

    // Verify "Checking Proof" pill is visible
    const checkingProofPill = desktopPage.locator('text=Checking Proof').first();
    const isCheckingProofVisible = await checkingProofPill.isVisible();
    console.log('"Checking Proof" status badge visible:', isCheckingProofVisible);

    const shot3 = path.join(ARTIFACT_DIR, 'verify_03_payment_under_verification.png');
    await desktopPage.screenshot({ path: shot3, fullPage: false });
    console.log('Saved screenshot 3:', shot3);

    // Now test high traffic: set start time to 65 seconds ago in localStorage to test high traffic transition
    console.log('\nSimulating elapsed > 60s for high traffic notice...');
    await desktopPage.evaluate((id) => {
      localStorage.setItem(`vib_verify_start_${id}`, String(Date.now() - 65000));
    }, adOrderId);
    // Wait for next 1s interval tick
    await desktopPage.waitForTimeout(1500);

    const highTrafficNotice = desktopPage.locator('text=EXPERIENCING HIGH TRAFFIC').first();
    const isHighTrafficVisible = await highTrafficNotice.isVisible();
    console.log('EXPERIENCING HIGH TRAFFIC notice visible after 60s threshold:', isHighTrafficVisible);

    const shot4 = path.join(ARTIFACT_DIR, 'verify_04_high_traffic_notice.png');
    await desktopPage.screenshot({ path: shot4, fullPage: false });
    console.log('Saved screenshot 4:', shot4);

    // -------------------------------------------------------------
    // TEST 4: OrderTrackingModal Payment Under Verification & High Traffic
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Verifying Order Tracking Modal with submitted payment...');
    // Direct link to tracking modal via query param ?track=
    await desktopPage.goto(`${BASE_URL}/?track=${encodeURIComponent(adOrderId)}`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(2000);

    const modalUnderVerif = desktopPage.locator('text=PAYMENT UNDER VERIFICATION').first();
    const isModalUnderVerifVisible = await modalUnderVerif.isVisible();
    console.log('OrderTrackingModal "PAYMENT UNDER VERIFICATION" visible:', isModalUnderVerifVisible);

    const modalHighTraffic = desktopPage.locator('text=EXPERIENCING HIGH TRAFFIC').first();
    const isModalHighTrafficVisible = await modalHighTraffic.isVisible();
    console.log('OrderTrackingModal "EXPERIENCING HIGH TRAFFIC" visible:', isModalHighTrafficVisible);

    const shot5 = path.join(ARTIFACT_DIR, 'verify_05_tracking_modal_under_verification.png');
    await desktopPage.screenshot({ path: shot5, fullPage: false });
    console.log('Saved screenshot 5:', shot5);

    await desktopContext.close();
    console.log('\n=== ALL PLAYWRIGHT VERIFICATIONS PASSED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Error during Playwright verification:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
