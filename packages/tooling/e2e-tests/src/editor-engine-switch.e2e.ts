import { expect, type Page, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  pressAppShortcut,
} from './common';

const PM_EDITOR = '[data-editor-engine="prosemirror"]';
const WORDGARD_EDITOR = '[data-editor-engine="wordgard"]';

async function runSwitchEngineCommand(page: Page, optionName: string) {
  await pressAppShortcut(page, 'k');
  const commandInput = page.getByPlaceholder('Type a command or search...');
  await commandInput.fill('Switch Editor Engine');
  await page.keyboard.press('Enter');
  await page.getByRole('option', { name: optionName }).click();
}

test('switching editor engines round-trips through reload with the note intact', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'engine-switch-ws',
    noteName: 'engine-note',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially('# Hello Engines', { delay: 30 });
  await expect(editor).toContainText('Hello Engines');

  await test.step('switch to the experimental Wordgard engine', async () => {
    await runSwitchEngineCommand(page, 'Wordgard (experimental)');

    const wordgardEditor = page.locator(WORDGARD_EDITOR);
    await expect(wordgardEditor).toBeVisible();
    // The M0b stub renders the raw markdown source read-only.
    await expect(wordgardEditor).toContainText('# Hello Engines');
    await expect(wordgardEditor).not.toHaveAttribute('contenteditable', 'true');
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Wordgard editor (experimental preview)' }),
    ).toBeVisible();
  });

  await test.step('engine choice persists across a browser reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    const wordgardEditor = page.locator(WORDGARD_EDITOR);
    await expect(wordgardEditor).toBeVisible();
    await expect(wordgardEditor).toContainText('# Hello Engines');
  });

  await test.step('typing must not change the read-only note', async () => {
    const wordgardEditor = page.locator(WORDGARD_EDITOR);
    await wordgardEditor.click();
    await page.keyboard.type('SHOULD NOT APPEAR');
    await expect(wordgardEditor).not.toContainText('SHOULD NOT APPEAR');
  });

  await test.step('the notice offers a one-click way back to the stable engine', async () => {
    await page.getByRole('button', { name: 'Switch editor' }).click();
    await page.getByRole('option', { name: 'ProseMirror (stable)' }).click();

    const pmEditor = page.locator(PM_EDITOR);
    await expect(pmEditor).toBeVisible();
    await expect(pmEditor).toContainText('Hello Engines');

    // Back on the stable engine, the note is editable again and the edit
    // survives: the switch never lost data.
    await pmEditor.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' edited');
    await expect(pmEditor).toContainText('Hello Engines edited');
  });
});
