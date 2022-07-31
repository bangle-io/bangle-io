import { expect } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import {
  createNewNote,
  createWorkspace,
  sleep,
  waitForEditorFocus,
} from '../helpers';
import { test } from '../test-extension';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test.describe('worker', () => {
  test.use({
    bangleDebugConfig: {
      writeSlowDown: 500,
    },
  });

  test('worker health check', async ({ page }) => {
    await createWorkspace(page);

    expect(page.workers()).toHaveLength(1);

    const result = await page.evaluate(() =>
      window._newE2eHelpers2?.e2eHealthCheck(),
    );

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
        const state = window._newE2eHelpers2?.store.state!;

        return window._newE2eHelpers2?.pageSliceKey.getSliceState(state);
      });

    expect(await pageSliceState()).toEqual({
      // block-reload should be true since we typed and
      // have a enabled writeSlowDown too
      blockReload: true,
      lifeCycleState: {
        current: 'active',
      },
      location: {
        pathname: `/ws/${wsName1}/test-note.md`,
        search: '',
      },
      pendingNavigation: {
        location: {
          pathname: `/ws/${wsName1}/test-note.md`,
          search: '',
        },
        preserve: false,
        replaceHistory: false,
      },
    });

    // after a while it should be set blockReload to false
    await expect
      .poll(async () => {
        return (await pageSliceState())?.blockReload;
      })
      .toBe(false);
  });
});
