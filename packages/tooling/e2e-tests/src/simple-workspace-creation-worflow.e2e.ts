import { expect, test } from '@playwright/test';
import {
  clearEditor,
  getEditorLocator,
  getEditorText,
  pressAppShortcut,
} from './common';

test('Simple Workspace Creation Workflow', async ({ page }) => {
  await page.goto('/');

  const mainContentLocator = page.locator('main.B-app-page-content');
  const fileExplorer = page.getByTestId('bangle-file-explorer');

  await test.step('disable file creation without a workspace', async () => {
    await expect(
      fileExplorer.getByRole('button', { name: 'New File' }),
    ).toBeDisabled();
    await expect(
      fileExplorer.getByRole('button', { name: 'New Folder' }),
    ).toBeDisabled();

    await page.getByRole('button', { name: /Bangle\.io/ }).click();
    await expect(
      page.getByRole('menuitem', { name: 'New Note' }),
    ).toBeDisabled();
    await expect(
      page.getByRole('menuitem', { name: 'New Workspace' }),
    ).toBeEnabled();
    await page.keyboard.press('Escape');

    await pressAppShortcut(page, 'k');
    const commandInput = page.getByPlaceholder('Type a command or search...');
    for (const commandTitle of ['New Note', 'Quick New Note', 'New Folder']) {
      await commandInput.fill(commandTitle);
      await expect(
        page.getByRole('option', { name: commandTitle, exact: true }),
      ).toHaveCount(0);
    }
    await page.keyboard.press('Escape');
  });

  await test.step('create new workspace', async () => {
    await page.getByRole('button', { name: 'Create Workspace' }).click();

    await expect(page.getByRole('radiogroup')).toContainText('Browser');
    await page
      .getByRole('radio', { name: 'Browser Save workspace data' })
      .click();

    await page.getByRole('button', { name: 'Next' }).click();

    await expect(
      page.getByLabel('Workspace Name', { exact: true }),
    ).toBeVisible();

    await page.getByLabel('Workspace Name', { exact: true }).fill('test-123');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(mainContentLocator).toContainText('test-123');
    await expect(page.getByRole('heading', { name: 'test-123' })).toBeVisible();
    await expect(mainContentLocator).toContainText(
      'No notes found in this workspace.',
    );
    await expect(
      fileExplorer.getByRole('button', { name: 'New File' }),
    ).toBeEnabled();
    await expect(
      fileExplorer.getByRole('button', { name: 'New Folder' }),
    ).toBeEnabled();

    await page.getByRole('button', { name: /Bangle\.io/ }).click();
    await expect(
      page.getByRole('menuitem', { name: 'New Note' }),
    ).toBeEnabled();
    await page.keyboard.press('Escape');

    await pressAppShortcut(page, 'k');
    const commandInput = page.getByPlaceholder('Type a command or search...');
    for (const commandTitle of ['New Note', 'Quick New Note', 'New Folder']) {
      await commandInput.fill(commandTitle);
      await expect(
        page.getByRole('option', { name: commandTitle, exact: true }),
      ).toBeVisible();
    }
    await page.keyboard.press('Escape');
  });

  await test.step('create new note', async () => {
    await expect(page.getByRole('button', { name: 'New Note' })).toBeVisible();
    await page.getByRole('button', { name: 'New Note' }).click();

    await expect(
      page.getByRole('dialog', { name: 'Create Note' }),
    ).toBeVisible();
    await page.getByLabel('Note name').fill('test-note-1');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(
      page
        .getByLabel('breadcrumb')
        .getByRole('button', { name: 'test-note-1.md' }),
    ).toBeVisible();
  });

  await test.step('verify toolbar', async () => {
    await expect(page.locator('header')).toMatchAriaSnapshot(`
      - button "Toggle Sidebar"
      - navigation "breadcrumb":
        - list:
          - listitem:
            - link "Home":
              - /url: /ws#route=ws-home&wsName=test-123
          - listitem:
            - button "test-note-1.md"
      - button "Star this item"
      - button "Toggle Max Width"
    `);
  });

  await test.step('edit note content', async () => {
    const editorHandle = getEditorLocator(page, {});
    await expect(editorHandle).toBeVisible();
    await editorHandle.click();
    await clearEditor(page, {});

    await editorHandle.pressSequentially('# Merry Christmas', { delay: 30 });
    const text = await getEditorText(page, {});
    // The heading's trailing fold-toggle widget makes ProseMirror keep an
    // invisible trailing break, which innerText reports as trailing
    // newlines; the rendered text is unchanged.
    expect(text.trimEnd()).toBe('Merry Christmas');
  });

  await test.step('verify persistence after reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    const textAfterReload = await getEditorText(page, {});
    expect(textAfterReload.trimEnd()).toBe('Merry Christmas');
  });
});
