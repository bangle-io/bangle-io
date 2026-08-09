import { expect, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
} from './common';

test('diagnostics is privacy-safe, copyable, and returns to the open note', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  const workspaceName = 'diagnostics-private-workspace-sentinel';
  const noteName = 'diagnostics-private-note-sentinel';
  const noteContent = 'DIAGNOSTICS_PRIVATE_CONTENT_SENTINEL_9f74';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  const editor = getEditorLocator(page, {});
  await editor.click();
  await clearEditor(page, {});
  await editor.pressSequentially(noteContent);
  await expect(editor).toContainText(noteContent);

  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Diagnostics' }).click();

  await expect(
    page.getByRole('heading', { name: 'Diagnostics', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to app' })).toBeVisible();
  const report = page.getByRole('region', { name: 'Diagnostics report' });
  await expect(report).toContainText('Version:');
  await expect(report).toContainText('Build ID:');
  await expect(report).toContainText('Environment:');
  await expect(report).toContainText('Runtime:');
  await expect(report).toContainText('IndexedDB:');
  await expect(report).toContainText('Storage persistence:');

  const reportText = await report.innerText();
  for (const sentinel of [workspaceName, noteName, noteContent]) {
    expect(reportText).not.toContain(sentinel);
  }

  await page.getByRole('button', { name: 'Copy diagnostics' }).click();
  await expect(page.getByText('Diagnostics copied')).toBeVisible();
  const copiedReport = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(copiedReport).toBe(
    await page.getByTestId('diagnostics-report').textContent(),
  );
  for (const sentinel of [workspaceName, noteName, noteContent]) {
    expect(copiedReport).not.toContain(sentinel);
  }

  await page.getByRole('link', { name: 'Back to app' }).click();
  await expect(
    page
      .getByLabel('breadcrumb')
      .getByRole('button', { name: `${noteName}.md` }),
  ).toBeVisible();
  await expect(editor).toContainText(noteContent);
});
