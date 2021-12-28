import { expect, test } from '@playwright/test';

import {
  clickItemInPalette,
  createNewNote,
  createWorkspace,
  ctrlKey,
  getEditorLocator,
  getItemsInPalette,
  getPrimaryEditorHandler,
  getWsPathsShownInFilePalette,
  openWorkspacePalette,
  sleep,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test('switching a workspace using the palette', async ({
  page,
  baseURL,
  context,
}) => {
  const wsName = await createWorkspace(page);

  await page.evaluate(
    async ([wsName]) => {
      let prom: any[] = [];
      for (let i = 0; i < 1000; i++) {
        prom.push(
          (window as any).__testCreateNote(
            `${wsName}:test-${i}.md`,
            Math.random().toString(36).substring(2, 7),
          ),
        );
      }
      await Promise.all(prom);
    },
    [wsName],
  );

  await page.pause();
  await context.storageState({ path: 'state.json' });
});
