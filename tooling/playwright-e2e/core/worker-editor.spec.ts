import { expect, test } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import {
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  SELECTOR_TIMEOUT,
  sleep,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test('reloads if doc is never modified and content changes externally', async ({
  page,
}) => {
  const wsName1 = await createWorkspace(page);
  const wsPath1 = await createNewNote(page, wsName1, 'file-1');

  await page.evaluate(
    async ([wsPath1]) => {
      const e2eHelpers = window._newE2eHelpers2;

      if (!e2eHelpers) {
        return;
      }
      const { store, pm } = e2eHelpers;

      await e2eHelpers.writeNote(
        wsPath1,
        pm.createNodeFromMd(`I am _overwrite_`),
      )(store.state, store.dispatch, store);
    },
    [wsPath1] as const,
  );

  await expect
    .poll(() => getEditorDebugString(page, PRIMARY_EDITOR_INDEX))
    .toBe(`doc(paragraph("I am ", italic("overwrite")))`);
});

test('reloads if doc is modified and then content changes externally', async ({
  page,
}) => {
  const wsName1 = await createWorkspace(page);
  const wsPath1 = await createNewNote(page, wsName1, 'file-1');

  await sleep(50);

  const editorHandle = await page.waitForSelector('.bangle-editor', {
    timeout: SELECTOR_TIMEOUT,
  });

  await editorHandle.type('wow 123!', { delay: 10 });

  await expect
    .poll(() => getEditorDebugString(page, PRIMARY_EDITOR_INDEX))
    .toBe(`doc(heading("wow 123!file-1"), paragraph("Hello world!"))`);

  await sleep(100);

  await page.evaluate(
    async ([wsPath1]) => {
      const e2eHelpers = window._newE2eHelpers2;

      if (!e2eHelpers) {
        return;
      }
      const { store, pm } = e2eHelpers;

      await e2eHelpers.writeNote(
        wsPath1,
        pm.createNodeFromMd(`I am _overwrite_`),
      )(store.state, store.dispatch, store);
    },
    [wsPath1] as const,
  );

  await expect
    .poll(() => getEditorDebugString(page, PRIMARY_EDITOR_INDEX))
    .toBe(`doc(paragraph("I am ", italic("overwrite")))`);
});
