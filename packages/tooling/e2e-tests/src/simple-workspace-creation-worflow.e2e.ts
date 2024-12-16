import { expect, test } from '@playwright/test';
import {
  EDITOR_SELECTOR,
  clearEditor,
  getEditorLocator,
  getEditorText,
} from './common';

test('Simple Workspace Creation Workflow', async ({ page }) => {
  await page.goto('/');

  await test.step('create new workspace', async () => {
    await page.getByRole('button', { name: 'New Workspace' }).click();

    await expect(page.getByRole('radiogroup')).toContainText('Browser');
    await page
      .getByRole('radio', { name: 'Browser Save workspace data' })
      .click();

    await page.getByRole('button', { name: 'Next' }).click();

    await expect(
      page.getByLabel('Workspace Name', { exact: true }),
    ).toBeVisible();

    await page.getByLabel('Workspace Name', { exact: true }).fill('test-123');
    await page.getByRole('button', { name: 'Create Workspace' }).click();

    await expect(page.getByRole('main')).toContainText('test-123');
    await expect(page.getByRole('main')).toContainText(
      'No notes found in this workspace.',
    );
  });

  await test.step('create new note', async () => {
    await expect(page.getByRole('button', { name: 'New Note' })).toBeVisible();
    await page.getByRole('button', { name: 'New Note' }).click();

    await expect(page.getByText('Create NoteCreate')).toBeVisible();
    await page.getByPlaceholder('Input a note name').fill('test-note-1');
    await page.getByRole('option', { name: 'Create' }).click();

    await expect(
      page
        .getByLabel('breadcrumb')
        .getByRole('button', { name: 'test-note-1.md' }),
    ).toBeVisible();
  });

  await test.step('verify toolbar', async () => {
    await expect(page.getByRole('main')).toMatchAriaSnapshot(`
    - button "Toggle Sidebar":
      - img
    - navigation "breadcrumb":
      - list:
        - listitem:
          - link:
            - img
        - listitem:
          - button "test-note-1.md"
    - button "Toggle Max Width":
      - img
    `);
  });

  await test.step('edit note content', async () => {
    const editorHandle = getEditorLocator(page, {});
    await expect(editorHandle).toBeVisible();
    await editorHandle.click();
    await clearEditor(page, {});

    await editorHandle.pressSequentially('# Merry Christmas', { delay: 30 });
    const text = await getEditorText(page, {});
    expect(text).toBe('Merry Christmas');
  });

  await test.step('verify persistence after reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    const textAfterReload = await getEditorText(page, {});
    expect(textAfterReload).toBe('Merry Christmas');
  });
});
