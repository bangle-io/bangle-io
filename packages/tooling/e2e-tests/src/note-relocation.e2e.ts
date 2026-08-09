import { expect, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  ctrlKey,
  expandFileTreeFolder,
  getEditorLocator,
  readStoredMarkdown,
  waitForEditorFocus,
  writeStoredFile,
  writeStoredMarkdown,
} from './common';

const PNG_1X1_BYTES = [
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120,
  156, 99, 248, 15, 4, 0, 9, 251, 3, 253, 167, 186, 48, 251, 0, 0, 0, 0, 73, 69,
  78, 68, 174, 66, 96, 130,
];

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

async function openMarkdownLink(page: Page, name: string) {
  await page.keyboard.down(ctrlKey);
  await getEditorLocator(page, {}).getByRole('link', { name }).click();
  await page.keyboard.up(ctrlKey);
}

test('moving a note preserves direct relative note and image links across an edit and reload', async ({
  page,
}, testInfo) => {
  const workspaceName = `note-relocation-links-${testInfo.workerIndex}-${Date.now()}`;
  const sourceName = 'projects/source';
  const movedName = 'Archive/source';
  const sourceWsPath = `${workspaceName}:${sourceName}.md`;
  const movedWsPath = `${workspaceName}:${movedName}.md`;
  const sourceMarkdown = [
    '# Relocation source',
    '',
    '[Open linked note](./target.md)',
    '',
    '![Relocation image](./assets/relocation.png)',
  ].join('\n');
  const postMoveEdit = ' Saved after relocation.';

  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: sourceName,
  });
  await writeStoredMarkdown(
    page,
    workspaceName,
    'projects/target',
    '# Linked target',
  );
  await writeStoredFile(
    page,
    workspaceName,
    'projects/assets/relocation.png',
    PNG_1X1_BYTES,
    'image/png',
  );
  await writeStoredMarkdown(page, workspaceName, 'Archive/placeholder', '');
  await writeStoredMarkdown(page, workspaceName, sourceName, sourceMarkdown);
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  const linkedNote = editor.getByRole('link', { name: 'Open linked note' });
  const image = editor.getByRole('img', { name: 'Relocation image' });
  await expect(linkedNote).toHaveAttribute('href', './target.md');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', /^blob:/);

  await expandFileTreeFolder(page, /^projects$/);
  await openFileAction(page, 'source.md', 'Move');
  const moveDialog = page.getByRole('dialog', {
    name: 'Move "source"',
  });
  const archiveOption = moveDialog.getByRole('option', { name: /Archive\/?/ });
  await expect(archiveOption).toBeVisible();
  await archiveOption.click();

  const movedUrl = `/ws#route=editor&wsPath=${encodeURIComponent(movedWsPath)}`;
  await expect(page).toHaveURL(movedUrl);
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(movedWsPath);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, movedName))
    .toContain('[Open linked note](../projects/target.md)');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, movedName))
    .toContain('![Relocation image](../projects/assets/relocation.png)');

  // This save must keep the rewritten destinations, not write the mounted
  // editor's pre-move snapshot back over them.
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.press('End');
  await page.keyboard.type(postMoveEdit);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, movedName))
    .toContain(postMoveEdit.trim());
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, movedName))
    .toContain('[Open linked note](../projects/target.md)');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, movedName))
    .toContain('![Relocation image](../projects/assets/relocation.png)');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, sourceName))
    .toBeUndefined();

  await expect(linkedNote).toHaveAttribute('href', '../projects/target.md');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', /^blob:/);
  await openMarkdownLink(page, 'Open linked note');
  await expect(page).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(`${workspaceName}:projects/target.md`)}`,
  );
  await expect(
    getEditorLocator(page, {}).getByRole('heading', {
      name: 'Linked target',
    }),
  ).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(movedUrl);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page).toHaveURL(movedUrl);
  await expect(linkedNote).toHaveAttribute('href', '../projects/target.md');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', /^blob:/);
  await openMarkdownLink(page, 'Open linked note');
  await expect(page).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(`${workspaceName}:projects/target.md`)}`,
  );
  await expect(
    getEditorLocator(page, {}).getByRole('heading', {
      name: 'Linked target',
    }),
  ).toBeVisible();

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, movedName))
    .toContain(postMoveEdit.trim());
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, sourceName))
    .toBeUndefined();
  await expect(page).not.toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(sourceWsPath)}`,
  );
});

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
