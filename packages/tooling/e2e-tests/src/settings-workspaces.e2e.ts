import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspace,
  createBrowserWorkspaceAndNote,
} from './common';

async function openWorkspacesSettings(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Workspaces' }).click();
  await expect(
    page.getByRole('heading', { name: 'Workspaces' }).first(),
  ).toBeVisible();
}

// The note-count cell lives in the same row as the workspace-name link, so scope
// the assertion to that link's row to prove per-workspace correctness.
function noteCountCell(
  page: import('@playwright/test').Page,
  workspaceName: string,
) {
  return page.getByRole('link', { name: workspaceName }).locator('..');
}

test('workspaces settings lists workspaces and exposes row actions', async ({
  page,
}) => {
  const workspaceWithNote = 'settings-workspaces-notes';
  const emptyWorkspace = 'settings-workspaces-empty';

  await createBrowserWorkspaceAndNote(page, {
    workspaceName: workspaceWithNote,
    noteName: 'first-note',
  });
  await createBrowserWorkspace(page, { workspaceName: emptyWorkspace });

  await openWorkspacesSettings(page);

  await expect(
    page.getByRole('link', { name: workspaceWithNote }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: emptyWorkspace })).toBeVisible();
  await expect(
    noteCountCell(page, workspaceWithNote).getByText('1 note'),
  ).toBeVisible();
  await expect(
    noteCountCell(page, emptyWorkspace).getByText('0 notes'),
  ).toBeVisible();
  await expect(page.getByText(/Last opened/).first()).toBeVisible();

  // The route is URL-addressable: reloading must re-hydrate the workspaces page.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Workspaces' }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: workspaceWithNote }),
  ).toBeVisible();

  await page
    .getByRole('button', {
      name: `Workspace actions for ${workspaceWithNote}`,
    })
    .click();
  await expect(
    page.getByRole('menuitem', { name: 'Open workspace' }),
  ).toBeVisible();
  await expect(
    page.getByRole('menuitem', { name: 'Delete workspace' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'New workspace' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Select a workspace type' }),
  ).toBeVisible();
  await page.getByRole('radio', { name: /Browser/i }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page
    .getByLabel('Workspace Name', { exact: true })
    .fill(workspaceWithNote);
  await page.getByRole('button', { name: 'Create' }).dblclick();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(
    'Cannot create workspace as it already exists',
  );
  await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled();
  await page.getByRole('button', { name: 'Cancel' }).click();

  const searchButton = page.getByRole('button', { name: /Search/ });
  await searchButton.focus();
  await searchButton.press('Space');
  await page.getByRole('combobox').fill('settings');
  await expect(
    page.getByRole('option', { exact: true, name: 'Settings' }),
  ).toBeVisible();
  await expect(
    page.getByRole('option', { name: 'Settings - General' }),
  ).toBeVisible();
  await expect(
    page.getByRole('option', { name: 'Settings - Workspaces' }),
  ).toBeVisible();
});

test('workspaces settings deletes a workspace from the row actions', async ({
  page,
}) => {
  const keptWorkspace = 'settings-workspaces-keep';
  const deletedWorkspace = 'settings-workspaces-delete';

  await createBrowserWorkspace(page, { workspaceName: keptWorkspace });
  await createBrowserWorkspace(page, { workspaceName: deletedWorkspace });

  await openWorkspacesSettings(page);

  await expect(
    page.getByRole('link', { name: deletedWorkspace }),
  ).toBeVisible();

  await page
    .getByRole('button', {
      name: `Workspace actions for ${deletedWorkspace}`,
    })
    .click();
  await page.getByRole('menuitem', { name: 'Delete workspace' }).click();

  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Delete' }).click();

  // The deleted workspace is gone and the other survives, before and after reload.
  await expect(page.getByRole('link', { name: deletedWorkspace })).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: keptWorkspace })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Workspaces' }).first(),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: deletedWorkspace })).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: keptWorkspace })).toBeVisible();
});
