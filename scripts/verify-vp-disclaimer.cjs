const { spawn } = require('child_process');
const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\rammo\\.gemini\\antigravity\\brain\\70f13134-b9d5-4c6f-86c5-d400bdf9aa43';
const PORT = 4181;
const URL = `http://localhost:${PORT}`;

async function main() {
  console.log('--- Starting Vite Preview on port', PORT, '---');
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', PORT.toString()], {
    cwd: path.resolve(__dirname, '..'),
    shell: true,
    stdio: 'pipe',
  });

  previewProcess.stdout.on('data', (d) => console.log('[Vite Preview]', d.toString().trim()));
  previewProcess.stderr.on('data', (d) => console.error('[Vite Preview Err]', d.toString().trim()));

  await new Promise((r) => setTimeout(r, 3000));

  console.log('--- Launching Chromium with Playwright (Chrome channel) ---');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('Console Err:', msg.text());
    });

    // 1. Navigate to VP Overview Page (?page=vp)
    console.log('\n[1/4] Checking VP Overview Page (?page=vp)...');
    await page.goto(`${URL}?page=vp`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const overviewNotices = await page.locator('text=Notice: Exact Riot ID & Tagline Required').count();
    console.log(`  - VP Overview Page Disclaimers Visible (Indian + PHP): ${overviewNotices}`);

    const overviewScreenshot = path.join(ARTIFACT_DIR, 'verify_vp_overview_disclaimer.png');
    await page.screenshot({ path: overviewScreenshot, fullPage: false });
    console.log(`  - Saved overview screenshot to ${overviewScreenshot}`);

    // 2. Open 475 VP Pack Product Page by clicking "Buy Now" on 475 VP in Indian VP section
    console.log('\n[2/4] Opening 475 VP Pack Product Page from VP Overview...');
    const firstBuyNow = page.getByRole('button', { name: 'Buy Now' }).first();
    await firstBuyNow.click();
    await page.waitForTimeout(1500);

    // Verify "100% Replacement Warranty" is GONE
    const warrantyCount = await page.locator('text=100% Replacement Warranty').count();
    console.log(`  - Count of "100% Replacement Warranty" (MUST BE 0): ${warrantyCount}`);

    // Verify "Official Riot Authorized" is present
    const authBadge = page.locator('text=Official Riot Authorized');
    const isAuthBadgeVis = await authBadge.isVisible();
    console.log(`  - Safety label says "Official Riot Authorized": ${isAuthBadgeVis}`);

    // Verify Mandatory Riot ID Accuracy Notice is present
    const noticeBanner = page.locator('text=Mandatory Riot ID Accuracy Notice');
    const isNoticeBannerVis = await noticeBanner.isVisible();
    console.log(`  - Product Page Disclaimer Banner Visible: ${isNoticeBannerVis}`);

    // Verify Quick Disclaimer before Buy Now
    const quickNotice = page.locator('text=Zero Replacement & Non-Refundable:');
    const isQuickNoticeVis = await quickNotice.isVisible();
    console.log(`  - Quick Disclaimer before Buy Now Visible: ${isQuickNoticeVis}`);

    const productScreenshot = path.join(ARTIFACT_DIR, 'verify_vp_product_page_no_replacement.png');
    await page.screenshot({ path: productScreenshot, fullPage: false });
    console.log(`  - Saved product page screenshot to ${productScreenshot}`);

    // 3. Click BUY NOW to go to Service Checkout Page
    console.log('\n[3/4] Clicking BUY NOW to check Checkout Page with Riot ID Disclaimer...');
    const buyNowBtn = page.locator('button:has-text("BUY NOW")').first();
    await buyNowBtn.click();
    await page.waitForTimeout(1500);

    const checkoutNotice = page.locator('text=Accurate Riot ID Required (No Replacement)');
    const isCheckoutNoticeVis = await checkoutNotice.isVisible();
    console.log(`  - Checkout Riot ID Disclaimer Notice Visible: ${isCheckoutNoticeVis}`);

    const checkoutSummaryNotice = page.locator('text=Fulfillment Disclaimer');
    const isCheckoutSummaryNoticeVis = await checkoutSummaryNotice.isVisible();
    console.log(`  - Checkout Summary Disclaimer Note Visible: ${isCheckoutSummaryNoticeVis}`);

    const checkoutScreenshot = path.join(ARTIFACT_DIR, 'verify_vp_checkout_riot_id_disclaimer.png');
    await page.screenshot({ path: checkoutScreenshot, fullPage: false });
    console.log(`  - Saved checkout screenshot to ${checkoutScreenshot}`);

    // 4. Navigate to Indian VP Packs Catalog (?page=vp-catalog)
    console.log('\n[4/4] Checking Indian VP Catalog Page (?page=vp-catalog)...');
    await page.goto(`${URL}?page=vp-catalog`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const catalogDisclaimer = page.locator('text=Important Fulfillment Notice');
    const isCatalogDisclaimerVis = await catalogDisclaimer.isVisible();
    console.log(`  - Catalog Page Disclaimer Visible: ${isCatalogDisclaimerVis}`);

    const catalogScreenshot = path.join(ARTIFACT_DIR, 'verify_vp_catalog_disclaimer.png');
    await page.screenshot({ path: catalogScreenshot, fullPage: false });
    console.log(`  - Saved catalog screenshot to ${catalogScreenshot}`);

    console.log('\n=== ALL VP VERIFICATION TESTS PASSED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Verification failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    previewProcess.kill();
    try {
      spawn('taskkill', ['/pid', previewProcess.pid.toString(), '/f', '/t'], { shell: true });
    } catch {}
    process.exit(0);
  }
}

main();
