import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  createNewNote,
  createWorkspace,
  ctrlKey,
  getPrimaryEditorHandler,
  waitForEditorFocus,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

const isEditorBarFocused = async (page: Page, editorId: number) => {
  return Boolean(
    await page.$(
      `.B-editor-container_editor-container-${editorId} .B-editor-container_editor-bar  > .BU_active`,
    ),
  );
};

const waitForEditorBarFocused = async (page: Page, editorId: number) => {
  await page
    .locator(
      `.B-editor-container_editor-container-${editorId} .B-editor-container_editor-bar  > .BU_active`,
    )
    .waitFor();
};

test('shows currerntly focused editor', async ({ page }) => {
  const wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test123');

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('\\');
  await page.keyboard.up(ctrlKey);

  // split screen auto focuses on the second (secondary) editor
  await waitForEditorFocus(page, 1);

  // wait for the focus action to be dispatched

  await waitForEditorBarFocused(page, 1);

  expect(await isEditorBarFocused(page, 0)).toBe(false);
  expect(await isEditorBarFocused(page, 1)).toBe(true);

  // Focus on first editor
  await getPrimaryEditorHandler(page, { focus: true });

  await waitForEditorBarFocused(page, 0);

  expect(await isEditorBarFocused(page, 0)).toBe(true);
  expect(await isEditorBarFocused(page, 1)).toBe(false);
});
