// playwright.config.ts
import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

// eslint-disable-next-line
const isCI = (process.env as any).CI;

const RETRY_COUNT = 3;

const config: PlaywrightTestConfig = {
  reporter: [['html', {}]],
  forbidOnly: !!isCI,
  timeout: 20000,
  expect: {
    timeout: 2000,
  },
  workers: isCI ? 1 : undefined,

  use: {
    // headless: false,
    trace: 'on-first-retry',
    // trace: 'retain-on-failure',
    navigationTimeout: 10000,
    // launchOptions: {
    //   slowMo: 50,
    // },
  },
  webServer: [
    {
      command: 'yarn g:build-prod-serve',
      port: 1234,
      timeout: 120 * 1000,
      reuseExistingServer: !isCI,
    },
    {
      command: 'yarn g:build-independent-e2e-tests-server',
      port: 1235,
      timeout: 120 * 1000,
      reuseExistingServer: !isCI,
    },
  ],
  projects: [
    {
      name: 'chromium',
      testIgnore: [/performance/, /-safari/, /-firefox/],
      retries: isCI ? RETRY_COUNT : 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'performance',
      testMatch: /performance/,
      retries: isCI ? RETRY_COUNT : 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'safari',
      testMatch: [/-safari/],
      retries: isCI ? RETRY_COUNT : 0,
      use: { ...devices['Desktop Safari'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
};

export default config;
