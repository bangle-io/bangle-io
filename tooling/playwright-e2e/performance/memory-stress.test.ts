import { chromium, expect, test } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

import {
  createWorkspaceFromBackup,
  getAllWsPaths,
  pushWsPathToPrimary,
  sleep,
  waitForNotification,
} from '../helpers';

test('Openning a lot of notes should not leak', async ({ baseURL }) => {
  test.slow();
  test.setTimeout(2 * 60000);
  const browser = await chromium.launch({
    // this is needed to run `window.gc()`
    args: ['--js-flags=--expose-gc'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseURL!, { waitUntil: 'networkidle' });

  const f = await fs.readFile(
    path.resolve(__dirname, 'fixture', '100-notes.zip'),
  );

  await createWorkspaceFromBackup(page, {
    name: '100-notes.zip',
    mimeType: 'application/archive',
    buffer: f,
  });

  await waitForNotification(page, 'Your notes have successfully restored.');

  const wsPaths = await getAllWsPaths(page, { lowerBound: 111 });
  // the fixture's asset count
  expect(wsPaths).toHaveLength(111);

  const noteWsPaths = wsPaths?.filter((r) => r.endsWith('.md')) || [];

  await page.evaluate(() => {
    (window as any).refs = [];
  });

  const EDITORS_TO_OPEN = 100;
  const FINAL_EDITORS_IN_MEMORY = 5;

  for (const w of noteWsPaths.slice(0, EDITORS_TO_OPEN)) {
    // open every editor in list
    await Promise.all([
      page.waitForNavigation(),
      pushWsPathToPrimary(page, w, { waitForEditorToLoad: false }),
    ]);

    // Make sure the editor instance is for the currently opened editor
    await page.waitForFunction(
      ([w]) => {
        const win: any = window;
        const editor = win._e2eHelpers._getEditors()?.[0];
        if (!editor) {
          return false;
        }
        return (
          win._e2eHelpers._getEditorPluginMetadata(editor.view.state)
            ?.wsPath === w
        );
      },
      [w],
    );

    // save a weak reference to the editor, so that we can later check
    // if it got GC'd or not.
    await page.evaluate(
      ([w]) => {
        const win: any = window;
        win.refs.push(new win.WeakRef(win._e2eHelpers._primaryEditor.view));
      },
      [w],
    );
  }

  const refs = await page.evaluate(() => {
    return (window as any).refs.length;
  });
  expect(refs).toBe(EDITORS_TO_OPEN);

  // deref all the weak references to get a count of persisted editors
  // in memory.
  const getEditorCountInMemory = async (attempt = 0): Promise<number> => {
    await page.evaluate(() => (window as any).gc());
    await sleep(500);

    const size = await page.evaluate(() => {
      return new Set((window as any).refs.map((r: any) => r.deref())).size;
    });
    if (size > FINAL_EDITORS_IN_MEMORY && attempt < 2) {
      return getEditorCountInMemory(attempt + 1);
    }
    return size;
  };

  // ideally it should just be one editor, but since GC is not predictable
  // we settle for good enough
  expect(await getEditorCountInMemory()).toBeLessThanOrEqual(
    FINAL_EDITORS_IN_MEMORY,
  );
});
