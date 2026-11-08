import { defineConfig, devices } from '@playwright/test';

/**
 * VIB 2.0 E2E regression suite.
 * Runs against the local dev stack: UI on :3000, API on :5000.
 * Test data: dedicated QA accounts seeded via tests/e2e/helpers/api.ts.
 */
export default defineConfig({
  testDir: './specs',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: '../test-results/html', open: 'never' }],
    ['json', { outputFile: '../test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    locale: 'en-IN',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
