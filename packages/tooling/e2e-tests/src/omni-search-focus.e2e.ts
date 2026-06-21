import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  ctrlKey,
  EDITOR_FOCUSED_SELECTOR,
  getEditorLocator,
} from './common';

test('command bar restores editor focus after Escape and Enter', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'omni-focus-workspace',
    noteName: 'omni-focus-note',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await expect(page.locator(EDITOR_FOCUSED_SELECTOR)).toBeVisible();

  await page.keyboard.press(`${ctrlKey}+k`);
  await expect(
    page.getByRole('dialog', { name: 'omni command bar' }),
  ).toBeVisible();
  await expect(
    page.getByPlaceholder('Type a command or search...'),
  ).toBeFocused();

  await page.keyboard.press('Escape');

  await expect(
    page.getByRole('dialog', { name: 'omni command bar' }),
  ).toBeHidden();
  await expect(page.locator(EDITOR_FOCUSED_SELECTOR)).toBeVisible();

  await page.keyboard.press(`${ctrlKey}+k`);
  const commandInput = page.getByPlaceholder('Type a command or search...');
  await commandInput.fill('omni-focus-note.md');
  await page.keyboard.press('Enter');

  await expect(
    page.getByRole('dialog', { name: 'omni command bar' }),
  ).toBeHidden();
  await expect(page.locator(EDITOR_FOCUSED_SELECTOR)).toBeVisible();
});
