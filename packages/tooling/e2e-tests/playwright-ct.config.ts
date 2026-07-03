import getEnvVars from '@bangle.io/env-vars';
import { defineConfig, devices } from '@playwright/experimental-ct-react';
import tailwindcss from '@tailwindcss/vite';

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

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './src',
  testMatch: '**/*.@(ct).?(c|m)[jt]s?(x)',

  /* The base directory, relative to the config file, for snapshot files created with toMatchSnapshot and toHaveScreenshot. */
  snapshotDir: './__snapshots__',
  /* Maximum time one test can run for. */
  timeout: 10 * 1000,
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
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Port to use for Playwright component endpoint. */
    ctPort: readPortEnv('BANGLE_E2E_CT_PORT', 3100),
    ctViteConfig: async () => {
      const envVars = getEnvVars({
        isProduction: true,
        isStorybook: true,
        helpDocsVersion: '0.0.0',
      });
      return {
        define: {
          ...envVars.globalIdentifiers,
        },
        plugins: tailwindcss(),
      };
    },
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
  ],
});
