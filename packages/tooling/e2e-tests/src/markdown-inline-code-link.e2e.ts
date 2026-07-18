import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  writeStoredMarkdown,
} from './common';

// Regression: the code mark used to exclude all other marks, so Markdown like
// [`web-code` #53575](https://google.com) lost its link at load time and the
// next save wrote the destroyed form back to storage.
const LINK_LINE = '[`web-code` #53575](https://google.com)';
const BOLD_LINE = '**bold `code` bold**';

test('preserves a link wrapping inline code across load, edit, and reload', async ({
  page,
}) => {
  const workspaceName = 'inline-code-link-ws';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'ticket',
  });
  await writeStoredMarkdown(
    page,
    workspaceName,
    'ticket',
    `${LINK_LINE}\n\n${BOLD_LINE}`,
  );
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});

  await test.step('loads with the link, code, and bold formatting visible', async () => {
    const link = editor.getByRole('link', { name: 'web-code #53575' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://google.com');
    await expect(link.locator('code')).toHaveText('web-code');
    await expect(editor.locator('strong').locator('code')).toHaveText('code');
  });

  await test.step('an unrelated edit keeps the link bytes intact on save', async () => {
    await editor.getByText('#53575').click();
    await page.keyboard.press('End');
    await page.keyboard.type(' tail');
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'ticket'))
      .toBe(`${LINK_LINE} tail\n\n${BOLD_LINE}`);
  });

  await test.step('formatting survives a second reload from the edited bytes', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    const link = editor.getByRole('link', { name: 'web-code #53575' });
    await expect(link).toBeVisible();
    await expect(link.locator('code')).toHaveText('web-code');
    await expect(editor.locator('strong').locator('code')).toHaveText('code');
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'ticket'))
      .toBe(`${LINK_LINE} tail\n\n${BOLD_LINE}`);
  });
});
