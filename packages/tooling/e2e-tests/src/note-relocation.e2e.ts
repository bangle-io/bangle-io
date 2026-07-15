import { expect, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  waitForEditorFocus,
  writeStoredMarkdown,
} from './common';

async function openFileAction(
  page: Page,
  fileName: string,
  action: 'Move' | 'Rename',
) {
  const explorer = page.getByTestId('bangle-file-explorer');
  await explorer
    .getByRole('treeitem', { name: fileName, exact: true })
    .click({ button: 'right' });
  await page
    .locator('[data-file-tree-context-menu-root="true"]')
    .getByRole('button', { name: action })
    .click();
}

function starredLink(page: Page, fileName: string) {
  return page
    .getByText('Starred', { exact: true })
    .locator('..')
    .getByRole('link', { name: fileName });
}

test('rename and move preserve the latest content and starred path across tabs and reload', async ({
  context,
  page,
}) => {
  const workspaceName = 'note-relocation-starred-workspace';
  const sourceName = 'source';
  const renamedName = 'renamed';
  const renamedWsPath = `${workspaceName}:${renamedName}.md`;
  const movedWsPath = `${workspaceName}:Archive/${renamedName}.md`;
  const latestContent = 'Latest content before relocation';
  const crossTabContent = ' edited from the second tab after rename';

  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: sourceName,
  });
  await writeStoredMarkdown(
    page,
    workspaceName,
    'Archive/existing',
    'Existing archive note',
  );
  await page.reload({ waitUntil: 'domcontentloaded' });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.type(latestContent);
  await page.getByRole('button', { name: 'Star this item' }).click();
  await expect(starredLink(page, `${sourceName}.md`)).toBeVisible();

  const secondPage = await context.newPage();
  await secondPage.goto(page.url());
  await expect(starredLink(secondPage, `${sourceName}.md`)).toBeVisible();

  await openFileAction(page, `${sourceName}.md`, 'Rename');
  const renameDialog = page.getByRole('dialog', { name: 'Rename Note' });
  await renameDialog
    .getByRole('textbox', { name: 'New name' })
    .fill(renamedName);
  await renameDialog.getByRole('textbox', { name: 'New name' }).press('Enter');

  await expect(page).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(renamedWsPath)}`,
  );
  await expect(starredLink(page, `${renamedName}.md`)).toHaveAttribute(
    'href',
    `/ws#route=editor&wsPath=${encodeURIComponent(renamedWsPath)}`,
  );
  await expect(starredLink(secondPage, `${renamedName}.md`)).toHaveAttribute(
    'href',
    `/ws#route=editor&wsPath=${encodeURIComponent(renamedWsPath)}`,
  );
  await expect(secondPage).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(renamedWsPath)}`,
  );

  const secondEditor = getEditorLocator(secondPage, {});
  await secondEditor.click();
  await waitForEditorFocus(secondPage, {});
  await secondPage.keyboard.press('End');
  await secondPage.keyboard.type(crossTabContent);
  await expect
    .poll(() => readStoredMarkdown(secondPage, workspaceName, renamedName))
    .toContain(crossTabContent.trim());

  await openFileAction(page, `${renamedName}.md`, 'Move');
  const moveDialog = page.getByRole('dialog', {
    name: `Move "${renamedName}"`,
  });
  await expect(
    moveDialog.getByRole('option', { name: /Archive\/?/ }),
  ).toBeVisible();
  await moveDialog.getByRole('combobox').press('Enter');

  await expect(page).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(movedWsPath)}`,
  );
  await expect(starredLink(page, `${renamedName}.md`)).toHaveAttribute(
    'href',
    `/ws#route=editor&wsPath=${encodeURIComponent(movedWsPath)}`,
  );
  await expect(starredLink(secondPage, `${renamedName}.md`)).toHaveAttribute(
    'href',
    `/ws#route=editor&wsPath=${encodeURIComponent(movedWsPath)}`,
  );
  await expect(secondPage).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(movedWsPath)}`,
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(getEditorLocator(page, {})).toContainText(latestContent);
  await expect(getEditorLocator(page, {})).toContainText(
    crossTabContent.trim(),
  );
  await expect(starredLink(page, `${renamedName}.md`)).toHaveAttribute(
    'href',
    `/ws#route=editor&wsPath=${encodeURIComponent(movedWsPath)}`,
  );
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Archive/renamed'))
    .toContain(latestContent);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, sourceName))
    .toBeUndefined();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, renamedName))
    .toBeUndefined();
});

test('folder rename drains active edits and relocates routes, descendants, and stars', async ({
  context,
  page,
}) => {
  const workspaceName = 'folder-relocation-workspace';
  const oldDir = 'folder';
  const newDir = 'vault';
  const sourceName = 'source';
  const oldWsPath = `${workspaceName}:${oldDir}/${sourceName}.md`;
  const newWsPath = `${workspaceName}:${newDir}/${sourceName}.md`;
  const latestContent = 'Latest edit immediately before folder rename';

  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: `${oldDir}/${sourceName}`,
  });
  await writeStoredMarkdown(
    page,
    workspaceName,
    `${oldDir}/nested/other`,
    'Nested sibling content',
  );
  await page.reload({ waitUntil: 'domcontentloaded' });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.type(latestContent);
  await page.getByRole('button', { name: 'Star this item' }).click();
  await expect(starredLink(page, `${sourceName}.md`)).toBeVisible();

  const secondPage = await context.newPage();
  await secondPage.goto(page.url());
  await expect(secondPage).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(oldWsPath)}`,
  );
  await expect(starredLink(secondPage, `${sourceName}.md`)).toBeVisible();

  const explorer = page.getByTestId('bangle-file-explorer');
  await explorer
    .getByRole('treeitem', { name: new RegExp(`^${oldDir}$`) })
    .click({ button: 'right' });
  await page.getByRole('button', { name: 'Rename' }).click();
  await page.getByPlaceholder('Provide a new folder name').fill(newDir);
  await page.getByRole('button', { name: 'Confirm folder rename' }).click();

  const expectedUrl = `/ws#route=editor&wsPath=${encodeURIComponent(newWsPath)}`;
  await expect(page).toHaveURL(expectedUrl);
  await expect(secondPage).toHaveURL(expectedUrl);
  await expect(starredLink(page, `${sourceName}.md`)).toHaveAttribute(
    'href',
    expectedUrl,
  );
  await expect(starredLink(secondPage, `${sourceName}.md`)).toHaveAttribute(
    'href',
    expectedUrl,
  );
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, `${newDir}/source`))
    .toContain(latestContent);
  await expect
    .poll(() =>
      readStoredMarkdown(page, workspaceName, `${newDir}/nested/other`),
    )
    .toBe('Nested sibling content');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, `${oldDir}/source`))
    .toBeUndefined();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(expectedUrl);
  await expect(getEditorLocator(page, {})).toContainText(latestContent);
  await expect(starredLink(page, `${sourceName}.md`)).toHaveAttribute(
    'href',
    expectedUrl,
  );
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, `${oldDir}/source`))
    .toBeUndefined();
});

test('rename conflict reports one expected error and preserves both notes', async ({
  page,
}) => {
  const workspaceName = 'note-rename-conflict-workspace';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'source',
  });
  await getEditorLocator(page, {}).click();
  await waitForEditorFocus(page, {});
  await page.keyboard.type('Source body');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'source'))
    .toBe('Source body');
  await writeStoredMarkdown(page, workspaceName, 'taken', 'Destination body');
  await page.reload({ waitUntil: 'domcontentloaded' });

  await openFileAction(page, 'source.md', 'Rename');
  const renameDialog = page.getByRole('dialog', { name: 'Rename Note' });
  await renameDialog.getByRole('textbox', { name: 'New name' }).fill('taken');
  await renameDialog.getByRole('textbox', { name: 'New name' }).press('Enter');

  await expect(
    page.getByText(
      'A note named "taken.md" already exists in the destination folder',
    ),
  ).toBeVisible();
  await expect(page.getByText('Could not rename file')).toHaveCount(0);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'source'))
    .toBe('Source body');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'taken'))
    .toBe('Destination body');
});
