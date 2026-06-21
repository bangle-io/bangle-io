import { devices, expect, test } from '@playwright/test';
import {
  collapseEditorSelection,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  selectEditorText,
} from './common';

test.use({ ...devices['Pixel 5'] });

test('exposes and operates the selection toolbar with touch input', async ({
  page,
}) => {
  const workspaceName = 'selection-touch';
  const noteName = 'touch';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  const editor = getEditorLocator(page, {});
  await editor.tap();
  await page.keyboard.insertText('touch formatting');
  await selectEditorText(page, 'touch');

  await expect
    .poll(() => page.evaluate(() => matchMedia('(pointer: coarse)').matches))
    .toBe(true);
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  await expect(toolbar).toBeVisible();
  await page.getByRole('button', { name: 'Bold' }).tap();
  await expect(toolbar).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(editor.locator('strong')).toHaveText('touch');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('**touch** formatting');

  await selectEditorText(page, 'formatting');
  await page.getByRole('button', { name: 'Link', exact: true }).tap();
  const urlInput = page.getByRole('textbox', { name: 'Link URL' });
  await urlInput.fill('touch.example');
  await urlInput.press('Enter');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('**touch** [formatting](https://touch.example/)');

  await collapseEditorSelection(page, 8);
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
  await expect
    .poll(() =>
      page.getByTestId('link-editor').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.left >= 0 &&
          rect.top >= 0 &&
          rect.right <= window.innerWidth &&
          rect.bottom <= window.innerHeight
        );
      }),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Star this item' }).tap();
  await expect(urlInput).toBeHidden();
});
