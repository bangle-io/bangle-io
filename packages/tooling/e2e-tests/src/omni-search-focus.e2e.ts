import { expect, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  EDITOR_FOCUSED_SELECTOR,
  getEditorLocator,
  pressAppShortcut,
} from './common';

async function expectDialogCentered(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'omni command bar' });

  await expect(dialog).toBeVisible();
  await expect
    .poll(
      () =>
        dialog.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return Math.max(
            Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2),
            Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2),
          );
        }),
      {
        message: 'Expected the omni command dialog to remain centered',
      },
    )
    .toBeLessThanOrEqual(1);
}

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

  await pressAppShortcut(page, 'k');
  await expectDialogCentered(page);
  await expect(
    page.getByPlaceholder('Type a command or search...'),
  ).toBeFocused();

  await page.keyboard.press('Escape');

  await expect(
    page.getByRole('dialog', { name: 'omni command bar' }),
  ).toBeHidden();
  await expect(page.locator(EDITOR_FOCUSED_SELECTOR)).toBeVisible();

  await pressAppShortcut(page, 'k');
  const commandInput = page.getByPlaceholder('Type a command or search...');
  await commandInput.fill('omni-focus-note.md');
  await page.keyboard.press('Enter');

  await expect(
    page.getByRole('dialog', { name: 'omni command bar' }),
  ).toBeHidden();
  await expect(page.locator(EDITOR_FOCUSED_SELECTOR)).toBeVisible();
});

test('command bar and all-commands route stay centered when translate utilities are unavailable', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'omni-position-workspace',
    noteName: 'omni-position-note',
  });

  await page.addStyleTag({
    content: String.raw`
      .translate-x-\[-50\%\],
      .translate-y-\[-50\%\] {
        transform: none;
        translate: none;
      }
    `,
  });

  await pressAppShortcut(page, 'k');
  await expectDialogCentered(page);

  await page.getByPlaceholder('Type a command or search...').fill('>');
  await expect(page.getByText('> Commands')).toBeVisible();
  await expectDialogCentered(page);
});
