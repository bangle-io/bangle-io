import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspace,
  dragTreeItemOnto,
  readStoredMarkdown,
  writeStoredMarkdown,
} from './common';

test('file explorer deletes multiple selected files from one confirmation', async ({
  page,
}) => {
  const workspaceName = `explorer-multi-delete-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });
  await writeStoredMarkdown(page, workspaceName, 'alpha', 'Alpha');
  await writeStoredMarkdown(page, workspaceName, 'beta', 'Beta');
  await writeStoredMarkdown(page, workspaceName, 'gamma', 'Gamma');
  await writeStoredMarkdown(page, workspaceName, 'keep', 'Keep');

  await page.goto(
    `/ws#route=ws-home&wsName=${encodeURIComponent(workspaceName)}`,
  );
  await page.reload();

  const explorer = page.getByTestId('bangle-file-explorer');
  const alphaRow = explorer.getByRole('treeitem', { name: /^alpha\.md$/ });
  const betaRow = explorer.getByRole('treeitem', { name: /^beta\.md$/ });
  const gammaRow = explorer.getByRole('treeitem', { name: /^gamma\.md$/ });
  const keepRow = explorer.getByRole('treeitem', { name: /^keep\.md$/ });

  await expect(alphaRow).toBeVisible();
  await expect(betaRow).toBeVisible();
  await expect(gammaRow).toBeVisible();
  await expect(keepRow).toBeVisible();

  await alphaRow.click();
  await gammaRow.click({ modifiers: ['Shift'] });

  await expect(alphaRow).toHaveAttribute('aria-selected', 'true');
  await expect(betaRow).toHaveAttribute('aria-selected', 'true');
  await expect(gammaRow).toHaveAttribute('aria-selected', 'true');

  await gammaRow.hover();
  await explorer.getByRole('button', { name: 'Options' }).click();
  await page.getByRole('button', { name: 'Delete 3 files' }).click();

  const confirmDeleteDialog = page.getByRole('alertdialog', {
    name: 'Confirm Delete',
  });
  await expect(confirmDeleteDialog).toBeVisible();
  await expect(confirmDeleteDialog).toContainText('alpha.md');
  await expect(confirmDeleteDialog).toContainText('beta.md');
  await expect(confirmDeleteDialog).toContainText('gamma.md');
  await confirmDeleteDialog
    .getByRole('button', { name: 'Delete Files' })
    .click();

  await expect(page.getByText('Deleted 3 files')).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'alpha'))
    .toBeUndefined();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'beta'))
    .toBeUndefined();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'gamma'))
    .toBeUndefined();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'keep'))
    .toBe('Keep');

  await page.reload();
  await expect(alphaRow).toHaveCount(0);
  await expect(betaRow).toHaveCount(0);
  await expect(gammaRow).toHaveCount(0);
  await expect(keepRow).toBeVisible();
});

test('file explorer ignores stale multi-selection when opening an unselected row menu', async ({
  page,
}) => {
  const workspaceName = `explorer-stale-selection-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });
  await writeStoredMarkdown(page, workspaceName, 'alpha', 'Alpha');
  await writeStoredMarkdown(page, workspaceName, 'beta', 'Beta');
  await writeStoredMarkdown(page, workspaceName, 'gamma', 'Gamma');
  await writeStoredMarkdown(page, workspaceName, 'keep', 'Keep');

  await page.goto(
    `/ws#route=ws-home&wsName=${encodeURIComponent(workspaceName)}`,
  );
  await page.reload();

  const explorer = page.getByTestId('bangle-file-explorer');
  const alphaRow = explorer.getByRole('treeitem', { name: /^alpha\.md$/ });
  const betaRow = explorer.getByRole('treeitem', { name: /^beta\.md$/ });
  const gammaRow = explorer.getByRole('treeitem', { name: /^gamma\.md$/ });
  const keepRow = explorer.getByRole('treeitem', { name: /^keep\.md$/ });

  await alphaRow.click();
  await gammaRow.click({ modifiers: ['Shift'] });
  await expect(alphaRow).toHaveAttribute('aria-selected', 'true');
  await expect(betaRow).toHaveAttribute('aria-selected', 'true');
  await expect(gammaRow).toHaveAttribute('aria-selected', 'true');

  await keepRow.hover();
  await explorer.getByRole('button', { name: 'Options' }).click();

  await expect(
    page.getByRole('button', { name: 'Delete 3 files' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete' }).click();

  const confirmDeleteDialog = page.getByRole('alertdialog', {
    name: 'Confirm Delete',
  });
  await expect(confirmDeleteDialog).toBeVisible();
  await expect(confirmDeleteDialog).toContainText('keep');
  await expect(confirmDeleteDialog).not.toContainText('alpha.md');
  await expect(confirmDeleteDialog).not.toContainText('beta.md');
  await expect(confirmDeleteDialog).not.toContainText('gamma.md');
  await confirmDeleteDialog.getByRole('button', { name: 'Cancel' }).click();

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'alpha'))
    .toBe('Alpha');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'beta'))
    .toBe('Beta');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'gamma'))
    .toBe('Gamma');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'keep'))
    .toBe('Keep');
});

test('file explorer can drag a nested note back to the workspace root', async ({
  page,
}) => {
  const workspaceName = `explorer-root-move-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });
  await writeStoredMarkdown(page, workspaceName, 'docs/nested', 'Move root');
  await writeStoredMarkdown(page, workspaceName, 'keep', 'Keep');

  await page.goto(
    `/ws#route=ws-home&wsName=${encodeURIComponent(workspaceName)}`,
  );
  await page.reload();

  const explorer = page.getByTestId('bangle-file-explorer');
  const docsFolder = explorer.getByRole('treeitem', { name: /^docs$/ });

  await docsFolder.focus();
  await page.keyboard.press('ArrowRight');
  const nestedNote = explorer.getByRole('treeitem', { name: /^nested\.md$/ });
  const keepNote = explorer.getByRole('treeitem', { name: /^keep\.md$/ });
  await expect(nestedNote).toBeVisible();
  await expect(keepNote).toBeVisible();

  await nestedNote.click();
  await dragTreeItemOnto(page, nestedNote, keepNote);

  await expect(page.getByText('Moved nested.md')).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'nested'))
    .toBe('Move root');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'docs/nested'))
    .toBeUndefined();
  await page.reload();
  await expect(
    explorer.getByRole('treeitem', { name: /^nested\.md$/ }),
  ).toBeVisible();
  await expect(explorer.getByRole('treeitem', { name: /^docs$/ })).toHaveCount(
    0,
  );
});
