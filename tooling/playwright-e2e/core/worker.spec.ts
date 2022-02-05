import { expect, test } from '@playwright/test';

import { createNewNote, createWorkspace, waitForEditorFocus } from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test.describe.parallel('worker', () => {
  test('Typing a note should enable blockReload', async ({ page }) => {
    const wsName1 = await createWorkspace(page);

    const wsPath = await createNewNote(page, wsName1, 'test-note.md');

    await waitForEditorFocus(page, 0, { wsPath });

    await page.keyboard.type('Hello _world_!', { delay: 10 });

    const pageSliceState = async () =>
      JSON.parse(
        await page.evaluate(() => {
          return JSON.stringify(
            (window as any)._e2eHelpers._getPageSliceState(),
          );
        }),
      );

    expect(await pageSliceState()).toEqual({
      // block-reload should be true since we types
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

    await page.waitForFunction(() => {
      return (
        (window as any)._e2eHelpers._getPageSliceState().blockReload === false
      );
    });
  });

  test('worker health check', async ({ page }) => {
    await createWorkspace(page);
    const result = JSON.parse(
      await page.evaluate(async () =>
        JSON.stringify(await (window as any)._e2eHelpers.e2eHealthCheck()),
      ),
    );
    expect(result).toBe(true);
  });
});
