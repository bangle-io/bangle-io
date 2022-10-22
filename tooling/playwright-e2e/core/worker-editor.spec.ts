import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import {
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  SELECTOR_TIMEOUT,
  sleep,
  waitForEditorFocus,
} from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});

const executeOverwrite = async (page: Page, wsPath: string) => {
  await page.evaluate(
    async ([wsPath]) => {
      const e2eHelpers = window._newE2eHelpers2;

      if (!e2eHelpers) {
        return;
      }
      const { store, pm } = e2eHelpers;

      await e2eHelpers.writeNote(
        wsPath,
        pm.createNodeFromMd(`I am _overwrite_`),
      )(store.state, store.dispatch, store);
    },
    [wsPath] as const,
  );
};

test('resets if a newly created doc which is not modified and then its content are changed externally', async ({
  page,
}) => {
  const wsName1 = await createWorkspace(page);
  const wsPath1 = await createNewNote(page, wsName1, 'file-1');

  await executeOverwrite(page, wsPath1);

  await expect
    .poll(() => getEditorDebugString(page, PRIMARY_EDITOR_INDEX), {
      timeout: 3 * SELECTOR_TIMEOUT,
    })
    .toBe(`doc(paragraph("I am ", italic("overwrite")))`);
});

test('resets an existing doc which is not modified and its content changes externally', async ({
  page,
}) => {
  const wsName1 = await createWorkspace(page);
  const wsPath1 = await createNewNote(page, wsName1, 'file-1');
  await sleep();

  await page.reload({ timeout: 8000, waitUntil: 'networkidle' });

  await waitForEditorFocus(page, PRIMARY_EDITOR_INDEX);

  await executeOverwrite(page, wsPath1);

  await expect
    .poll(() => getEditorDebugString(page, PRIMARY_EDITOR_INDEX), {
      timeout: 3 * SELECTOR_TIMEOUT,
    })
    .toBe(`doc(paragraph("I am ", italic("overwrite")))`);
});

test('resets doc when it is created then modified and then content changes externally', async ({
  page,
}) => {
  const wsName1 = await createWorkspace(page);
  const wsPath1 = await createNewNote(page, wsName1, 'file-1');

  const editorHandle = await page.waitForSelector('.bangle-editor', {
    timeout: SELECTOR_TIMEOUT,
  });

  await editorHandle.type('wow 123!', { delay: 10 });

  await expect
    .poll(() => getEditorDebugString(page, PRIMARY_EDITOR_INDEX), {
      timeout: 3 * SELECTOR_TIMEOUT,
    })
    .toBe(`doc(heading("wow 123!file-1"), paragraph("Hello world!"))`);

  await sleep(100);

  await executeOverwrite(page, wsPath1);

  await expect
    .poll(() => getEditorDebugString(page, PRIMARY_EDITOR_INDEX))
    .toBe(`doc(paragraph("I am ", italic("overwrite")))`);
});
