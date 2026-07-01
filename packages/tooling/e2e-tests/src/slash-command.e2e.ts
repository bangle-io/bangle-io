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

test('slash command can insert a persisted code block', async ({ page }) => {
  const workspaceName = 'slash-command-code-block';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  await expect(page.getByText('Code block')).toBeVisible();
  await page.keyboard.insertText('code');

  const codeBlockCommand = page.getByText('Code block');
  await expect(codeBlockCommand).toBeVisible();
  await codeBlockCommand.click();
  await page.keyboard.insertText('const viaSlash = true;');

  await expect(editor.locator('pre code')).toContainText(
    'const viaSlash = true;',
  );
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('```\nconst viaSlash = true;\n```');
});
