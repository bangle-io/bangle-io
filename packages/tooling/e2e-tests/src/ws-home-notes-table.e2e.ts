import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  expectNoPageHorizontalOverflow,
} from './common';

function notesTable(page: Page): Locator {
  return page.getByTestId('ws-home-notes-table');
}

function noteRows(page: Page): Locator {
  return notesTable(page).locator('tbody tr');
}

async function createNoteFromHome(page: Page, noteName: string) {
  await page.getByRole('button', { name: 'New Note' }).click();
  await page.getByLabel('Note name').fill(noteName);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('.ProseMirror')).toBeVisible();
}

async function goHome(page: Page) {
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(notesTable(page)).toBeVisible();
}

test('workspace home lists notes in a sortable, filterable table', async ({
  page,
}) => {
  const workspaceName = 'notes-table-ws';
  await page.setViewportSize({ width: 1280, height: 800 });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'alpha-note',
  });

  await goHome(page);

  // The first note shows with its modification time filled in.
  await expect(noteRows(page)).toHaveCount(1);
  await expect(
    notesTable(page).getByRole('link', { name: /alpha-note/ }),
  ).toBeVisible();
  const firstRowModifiedCell = noteRows(page).first().locator('td').nth(2);
  await expect(firstRowModifiedCell).toContainText(/ago/);

  await createNoteFromHome(page, 'zulu-note');
  await goHome(page);

  // Default order is most recently modified first.
  await expect(noteRows(page)).toHaveCount(2);
  await expect(noteRows(page).nth(0)).toContainText('zulu-note');
  await expect(noteRows(page).nth(1)).toContainText('alpha-note');

  // Sorting by name flips to alphabetical order.
  await page.getByRole('button', { name: 'Sort by Name' }).click();
  await expect(noteRows(page).nth(0)).toContainText('alpha-note');
  await expect(noteRows(page).nth(1)).toContainText('zulu-note');

  // Filtering narrows rows and reports empty matches without destroying
  // anything.
  const filterInput = page.getByRole('textbox', { name: 'Filter notes' });
  await filterInput.fill('zulu');
  await expect(noteRows(page)).toHaveCount(1);
  await expect(noteRows(page).first()).toContainText('zulu-note');
  await filterInput.fill('no-such-note');
  await expect(notesTable(page)).toContainText('No notes match your filter.');
  await filterInput.clear();
  await expect(noteRows(page)).toHaveCount(2);

  // Column visibility: enable the Last opened column via the columns
  // dropdown and verify the choice survives a reload.
  await page.getByRole('button', { name: 'Columns' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Last opened' }).click();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Sort by Last opened' }),
  ).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(notesTable(page)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Sort by Last opened' }),
  ).toBeVisible();
  await expect(noteRows(page)).toHaveCount(2);

  // Clicking a row (outside its link) opens that note in the editor.
  await noteRows(page).nth(1).locator('td').nth(2).click();
  await expect(page.locator('.ProseMirror')).toBeVisible();
  await expect
    .poll(() => page.locator('.ProseMirror').getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:alpha-note.md`);
});

test('notes table row actions star and delete a note', async ({ page }) => {
  const workspaceName = 'notes-table-actions-ws';
  await page.setViewportSize({ width: 1280, height: 800 });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'action-target',
  });
  await goHome(page);

  // Star through the row menu: the star indicator appears in the row and the
  // note joins the sidebar starred section.
  await page.getByRole('button', { name: 'Actions for action-target' }).click();
  await page.getByRole('menuitem', { name: 'Star' }).click();
  await expect(
    noteRows(page).first().getByText('Starred', { exact: true }),
  ).toBeAttached();
  await expect(
    page.getByText('Starred', { exact: true }).first(),
  ).toBeVisible();

  // Delete through the row menu with explicit confirmation.
  await page.getByRole('button', { name: 'Actions for action-target' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toContainText(
    'Are you sure you want to delete "action-target"?',
  );
  await confirmation.getByRole('button', { name: 'Delete' }).click();

  await expect(
    page.getByText('No notes found in this workspace.'),
  ).toBeVisible();

  // The deletion is durable across reload.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByText('No notes found in this workspace.'),
  ).toBeVisible();
});

test('workspace home stays within compact desktop and mobile viewports', async ({
  page,
}) => {
  const noteName =
    'a-very-long-note-name-that-should-not-expand-the-workspace-home-layout';
  await page.setViewportSize({ width: 900, height: 800 });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'responsive-notes-table-ws',
    noteName,
  });
  await goHome(page);

  const tableContainer = notesTable(page).locator(
    '[data-slot="table-container"]',
  );
  await expectNoPageHorizontalOverflow(page);
  await expect(
    page.getByRole('button', { name: 'Switch Workspace' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Note' })).toBeVisible();
  await expect
    .poll(() =>
      tableContainer.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      ),
    )
    .toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoPageHorizontalOverflow(page);
  await expect(
    notesTable(page).getByRole('link', { name: noteName }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Columns' })).toBeVisible();
});
