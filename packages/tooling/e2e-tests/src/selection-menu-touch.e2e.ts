import { devices, expect, test } from '@playwright/test';
import {
  collapseEditorSelection,
  expectNoPageHorizontalOverflow,
  getEditorLocator,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  selectEditorText,
} from './common';

test.use({ ...devices['Pixel 5'] });

test('keeps coarse-pointer formatting controls and the link editor within the viewport', async ({
  page,
}) => {
  const expected = '**touch** [formatting](https://touch.example/)';
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: 'touch formatting',
    noteName: 'Touch',
    workspaceName: 'selection-touch',
  });
  const editor = getEditorLocator(page, {});
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });

  await editor.tap();
  await expect
    .poll(() => page.evaluate(() => matchMedia('(pointer: coarse)').matches))
    .toBe(true);
  // This deliberately uses a programmatic DOM range. Native long-press
  // selection is browser/OS-owned; the product contract under test begins
  // once the coarse-pointer editor has a non-empty selection.
  await selectEditorText(page, 'touch');
  await expect(toolbar).toBeVisible();
  await expect(
    toolbar.getByRole('button', { name: 'Task list' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      toolbar.evaluate((element) => {
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
  await expectNoPageHorizontalOverflow(page);
  await toolbar.getByRole('button', { name: 'Bold' }).tap();
  await expect(toolbar.getByRole('button', { name: 'Bold' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(editor.locator('strong')).toHaveText('touch');

  await selectEditorText(page, 'formatting');
  await toolbar.getByRole('button', { name: 'Link', exact: true }).tap();
  const urlInput = page.getByRole('textbox', { name: 'Link URL' });
  await urlInput.fill('touch.example');
  await urlInput.press('Enter');
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(expected);

  await collapseEditorSelection(page, 8);
  const linkEditor = page.getByTestId('link-editor');
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
  await expect
    .poll(() =>
      linkEditor.evaluate((element) => {
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
  await expectNoPageHorizontalOverflow(page);
  await urlInput.press('Escape');
  await expect(urlInput).toBeHidden();
});
