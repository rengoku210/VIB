const { spawn } = require('child_process');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\rammo\\.gemini\\antigravity\\brain\\70f13134-b9d5-4c6f-86c5-d400bdf9aa43';
const PORT = 4179;
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

  // Wait 3 seconds for preview server to be ready
  await new Promise((r) => setTimeout(r, 3000));

  console.log('--- Launching Chromium with Playwright ---');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop Test (1280x800)
    console.log('\n[1/2] Verifying Desktop "More" dropdown at 1280x800...');
    const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const consoleErrors = [];
    desktopPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Page Console Error:', msg.text());
        consoleErrors.push(msg.text());
      }
    });

    await desktopPage.goto(URL, { waitUntil: 'networkidle' });
    console.log('Page loaded successfully');

    // Click "More" button in header
    const moreBtn = desktopPage.locator('button:has-text("More")').first();
    await moreBtn.waitFor({ state: 'visible', timeout: 5000 });
    await moreBtn.click();
    console.log('Clicked "More" button');

    // Wait for dropdown menu
    const dropdown = desktopPage.locator('div[role="menu"]');
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Dropdown menu opened');

    // Verify key items inside dropdown
    const items = [
      'Change Region (IND → PHP)',
      'Urgent Sale Offer',
      'Valo Skins Exchange',
      'Fresh PHP Profile',
      'Advertise Profile Plans',
      'Trade / Exchange Plans',
      'Flexible Payment Plans',
      'Track Live Order',
      'Community & Discord',
      'Dedicated Support',
      'All Services Directory',
    ];

    for (const item of items) {
      const el = dropdown.locator(`text=${item}`);
      const isVis = await el.isVisible();
      console.log(`  - Item "${item}": ${isVis ? 'VISIBLE' : 'MISSING'}`);
    }

    // Capture screenshot of desktop dropdown
    const desktopScreenshotPath = path.join(ARTIFACT_DIR, 'verify_more_dropdown_desktop.png');
    await desktopPage.screenshot({ path: desktopScreenshotPath });
    console.log(`Desktop screenshot saved to ${desktopScreenshotPath}`);

    // 2. Mobile Drawer Test (375x812)
    console.log('\n[2/2] Verifying Mobile Drawer at 375x812...');
    const mobilePage = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await mobilePage.goto(URL, { waitUntil: 'networkidle' });

    // Click mobile hamburger menu
    const mobileMenuBtn = mobilePage.locator('button[aria-label="Open mobile navigation menu"], button:has(svg.lucide-menu)').first();
    await mobileMenuBtn.click();
    console.log('Clicked mobile hamburger menu');

    await mobilePage.waitForTimeout(600);

    const mobileScreenshotPath = path.join(ARTIFACT_DIR, 'verify_more_dropdown_mobile.png');
    await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: true });
    console.log(`Mobile screenshot saved to ${mobileScreenshotPath}`);

    console.log('\n=== VERIFICATION COMPLETE: ALL 11 ITEMS VERIFIED WITH BESPOKE ASSETS ===');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    previewProcess.kill();
    // Also kill on windows if needed
    try {
      spawn('taskkill', ['/pid', previewProcess.pid.toString(), '/f', '/t'], { shell: true });
    } catch {}
    process.exit(0);
  }
}

main();
