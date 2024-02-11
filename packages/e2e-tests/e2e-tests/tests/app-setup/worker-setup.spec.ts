import { expect } from '@playwright/test';

import { test } from '../../fixture-with-bangle';

test.beforeEach(async ({ bangleApp }) => {
  await bangleApp.open();
});

test('creates worker thread', async ({ page }) => {
  expect(page.workers()).toHaveLength(1);
});

test('is worker ready', async ({ page }) => {
  expect(
    await page.evaluate(() => {
      return window._nsmE2e.naukar.ok();
    }),
  ).toBe(true);
});

test('worker gets debug flags', async ({ bangleApp, page: oldPage }) => {
  const page = await bangleApp.open({
    debugFlags: {
      testNoOp: true,
    },
  });

  expect(
    await page.evaluate(() => {
      return window._nsmE2e.naukar.readDebugFlags();
    }),
  ).toMatchObject({ testNoOp: true });

  await oldPage.close();
  await page.close();
});

test('worker gets debug flags with delay', async ({
  bangleApp,
  page: oldPage,
}) => {
  const page = await bangleApp.open({
    debugFlags: {
      testNoOp: true,
      testDelayWorkerInitialize: 100,
    },
  });

  expect(
    await page.evaluate(() => {
      return window._nsmE2e.naukar.readDebugFlags();
    }),
  ).toMatchObject({ testNoOp: true, testDelayWorkerInitialize: 100 });

  await oldPage.close();
  await page.close();
});

test('works with worker disabled', async ({ bangleApp, page: oldPage }) => {
  const page = await bangleApp.open({
    debugFlags: {
      testDisableWorker: true,
    },
  });
  expect(
    await page.evaluate(() => {
      return window._nsmE2e.naukar.readDebugFlags();
    }),
  ).toMatchObject({ testDisableWorker: true });

  expect(page.workers()).toHaveLength(0);

  expect(
    await page.evaluate(async () => {
      return (await window._nsmE2e.naukar.readWindowState()).ui.colorScheme;
    }),
  ).toEqual('light');

  await oldPage.close();
  await page.close();
});

test.describe('worker window state', () => {
  test('worker gets state setup correctly', async ({ page }) => {
    const workerWindowState = await page.evaluate(() => {
      return window._nsmE2e.naukar.readWindowState();
    });

    expect(workerWindowState.ui.colorScheme).toEqual('light');
    expect(workerWindowState.ui.widescreen).toEqual(true);

    expect(workerWindowState.page.lifecycle).toEqual('active');
    expect(workerWindowState.page.location?.pathname).toEqual('/ws-select');
  });

  test('worker gets updated location', async ({ page }) => {
    let workerWindowState = await page.evaluate(() => {
      return window._nsmE2e.naukar.readWindowState();
    });
    expect(workerWindowState.page.location?.pathname).toEqual('/ws-select');

    await page.goto('/ws/foo');

    await page.waitForFunction(async () => {
      const state = await window._nsmE2e.naukar.readWindowState();

      return state.page.location?.pathname === '/ws/foo';
    });

    await page.goto('/ws/xoo?foo=bar');

    await page.waitForFunction(async () => {
      const state = await window._nsmE2e.naukar.readWindowState();

      return (
        state.page.location?.pathname === '/ws/xoo' &&
        state.page.location?.search === 'foo=bar'
      );
    });
  });

  test('worker gets color-scheme update', async ({ page }) => {
    expect(
      await page.evaluate(async () => {
        return (await window._nsmE2e.naukar.readWindowState()).ui.colorScheme;
      }),
    ).toEqual('light');

    await page.emulateMedia({ colorScheme: 'dark' });

    await page.waitForFunction(async () => {
      const state = await window._nsmE2e.naukar.readWindowState();
      return state.ui.colorScheme === 'dark';
    });
  });

  test('updates when worker disabled', async ({ bangleApp, page: oldPage }) => {
    const page = await bangleApp.open({
      debugFlags: {
        testDisableWorker: true,
      },
    });

    expect(
      await page.evaluate(async () => {
        return (await window._nsmE2e.naukar.readWindowState()).ui.colorScheme;
      }),
    ).toEqual('light');

    await page.emulateMedia({ colorScheme: 'dark' });

    await page.waitForFunction(async () => {
      const state = await window._nsmE2e.naukar.readWindowState();
      return state.ui.colorScheme === 'dark';
    });

    await oldPage.close();
    await page.close();
  });
});
