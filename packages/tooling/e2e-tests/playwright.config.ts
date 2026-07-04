import { defineConfig, devices } from '@playwright/test';

const MIN_DEV_PORT = 3000;
const MAX_PORT = 65_535;

function readPortEnv(name: string, fallback: number): number {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return fallback;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < MIN_DEV_PORT || port > MAX_PORT) {
    throw new Error(
      `${name} must be an integer port from ${MIN_DEV_PORT} to ${MAX_PORT}.`,
    );
  }

  return port;
}

const PORT = readPortEnv(
  'BANGLE_E2E_PORT',
  readPortEnv('BANGLE_DEV_PORT', 5173),
);
const BASE_URL = process.env.BANGLE_E2E_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);
const useExternalServer = process.env.BANGLE_E2E_EXTERNAL_SERVER === '1';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './src',
  testMatch: '**/*.@(e2e).?(c|m)[jt]s?(x)',
  snapshotDir: './__snapshots__',

  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: useExternalServer
    ? undefined
    : {
        command: `BANGLE_DEV_PORT=${PORT} pnpm --dir ../browser-entry exec vite --configLoader runner --host localhost --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !isCI,
      },
});
