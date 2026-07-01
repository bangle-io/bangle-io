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
  const selectedDate = new Date();
  selectedDate.setDate(1);
  selectedDate.setMonth(selectedDate.getMonth() + 1);
  selectedDate.setDate(15);
  selectedDate.setHours(0, 0, 0, 0);
  const selectedDateLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(selectedDate);
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

  await expect(page.getByRole('region', { name: 'Calendar' })).toBeVisible();
  await page.getByRole('button', { name: 'Next month' }).click();
  await page
    .getByRole('button', { name: `Select ${selectedDateLabel}` })
    .click();

  await expect(editor).toContainText(selectedDateLabel);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(selectedDateLabel);
});
