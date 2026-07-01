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
  const selectedDate = new Date(2028, 11, 15);
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
  await page.getByRole('spinbutton', { name: 'Month' }).fill('12');
  await page.getByRole('spinbutton', { name: 'Year' }).fill('2028');
  await page.getByRole('button', { name: 'Go' }).click();
  await expect(page.getByText('December 2028')).toBeVisible();
  await page
    .getByRole('button', { name: `Select ${selectedDateLabel}` })
    .click();

  await expect(editor).toContainText(selectedDateLabel);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(selectedDateLabel);
});

test('slash date command dismisses with Escape after calendar interaction', async ({
  page,
}) => {
  const workspaceName = 'slash-command-date-dismiss';
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

  const calendar = page.getByRole('region', { name: 'Calendar' });
  await expect(calendar).toBeVisible();
  await page.getByRole('button', { name: 'Next month' }).click();
  await page.keyboard.press('Escape');

  await expect(calendar).toBeHidden();
  await editor.click();
  await page.keyboard.insertText('After Escape');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('After Escape');
});
