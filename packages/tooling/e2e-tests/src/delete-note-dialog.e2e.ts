import { expect, test } from '@playwright/test';
import { createBrowserWorkspaceAndNote, pressAppShortcut } from './common';

test('delete note picker opens a confirmation step before deleting', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'delete-note-dialog-workspace',
    noteName: 'delete-target',
  });

  await pressAppShortcut(page, 'k');
  await page
    .getByPlaceholder('Type a command or search...')
    .fill('Delete Note');
  await page.getByRole('option', { name: '> Delete Note' }).click();

  const picker = page.getByLabel('dialog select');
  const deleteBadge = picker.getByText('Delete Note', { exact: true });
  await expect(deleteBadge).toBeVisible();
  await expect(deleteBadge.locator('xpath=parent::*')).not.toHaveClass(
    /bg-destructive/,
  );
  await expect(
    picker.getByText('Select a note to confirm deletion'),
  ).toBeVisible();
  await expect(page.getByRole('alertdialog')).toBeHidden();

  await page.getByRole('option', { name: 'delete-target.md' }).click();

  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText(
    'Are you sure you want to delete "delete-target"?',
  );
  await expect(
    confirmation.getByRole('button', { name: 'Delete' }),
  ).toBeVisible();
});
