import { expect } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { testWithConfig as test } from '../fixture-test-with-config';
import {
  createNewNote,
  createWorkspace,
  sleep,
  waitForEditorFocus,
} from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});

test.describe('worker', () => {
  test.use({
    bangleDebugConfig: {
      writeSlowDown: 300,
    },
  });

  test('worker health check', async ({ page }) => {
    await createWorkspace(page);

    expect(page.workers()).toHaveLength(1);

    const result = await page.evaluate(() => window._nsmE2e?.e2eHealthCheck());

    expect(result).toBe(true);
  });

  test('Typing a note should enable blockReload', async ({ page }) => {
    const wsName1 = await createWorkspace(page);

    const wsPath = await createNewNote(page, wsName1, 'test-note.md');

    await waitForEditorFocus(page, PRIMARY_EDITOR_INDEX, { wsPath });

    await sleep();

    await page.keyboard.type('Hello _world_!', { delay: 10 });

    const pageSliceState = async () =>
      page.evaluate(() => {
        const { getPageSliceState } = window._nsmE2e!;

        return getPageSliceState();
      });

    await sleep(50);

    // block-reload should be true since we typed and
    // have a enabled writeSlowDown too
    expect((await pageSliceState())?.blockReload).toBe(true);

    // after a while it should be set blockReload to false
    await expect
      .poll(async () => {
        return (await pageSliceState())?.blockReload;
      })
      .toBe(false);

    // type again to inspect the blockReload state changes
    await page.keyboard.type('more', { delay: 10 });

    await sleep();

    await expect
      .poll(async () => {
        return (await pageSliceState())?.blockReload;
      })
      .toBe(true);

    await expect
      .poll(async () => {
        return (await pageSliceState())?.blockReload;
      })
      .toBe(false);
  });
});
