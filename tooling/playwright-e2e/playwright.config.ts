// playwright.config.ts
import { devices, PlaywrightTestConfig } from '@playwright/test';

// eslint-disable-next-line
const isCI = (process.env as any).CI;

const config: PlaywrightTestConfig = {
  forbidOnly: !!isCI,
  retries: isCI ? 2 : 0,
  timeout: 20000,
  expect: {
    timeout: 2000,
  },
  workers: isCI ? 2 : undefined,

  use: {
    // headless: false,
    trace: 'on-first-retry',
    navigationTimeout: 10000,
    // launchOptions: {
    //   slowMo: 50,
    // },
  },
  webServer: {
    command: 'yarn g:build-prod-serve',
    port: 1234,
    timeout: 120 * 1000,
    reuseExistingServer: !isCI,
  },
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
  ],
};

export default config;
