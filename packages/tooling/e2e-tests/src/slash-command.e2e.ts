import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  waitForEditorFocus,
} from './common';

test('slash command stays active with multiple suggestion providers registered', async ({
  page,
}) => {
  const workspaceName = 'slash-command-suggestions';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');

  await expect(page.getByText('Heading 1')).toBeVisible();
  await page.getByText('Heading 1').click();
  await page.keyboard.insertText('Slash Title');

  await expect(
    editor.getByRole('heading', { name: 'Slash Title', level: 1 }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('# Slash Title');
});

test('slash date command inserts a selected calendar date', async ({
  page,
}) => {
  const workspaceName = 'slash-command-date-picker';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  await page.keyboard.insertText('date');

  const dateCommand = page.getByText('Date', { exact: true });
  await expect(dateCommand).toBeVisible();
  await dateCommand.click();

  const dateInput = page.getByLabel('Select date');
  await expect(dateInput).toBeVisible();
  await expect(dateInput).toHaveAttribute('type', 'date');

  await dateInput.fill('2025-12-24');

  await expect(editor).toContainText('Dec 24, 2025');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('Dec 24, 2025');
});
