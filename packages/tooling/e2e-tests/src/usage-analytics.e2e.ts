import { expect, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
} from './common';

async function startMeasurement(page: Page) {
  const url = new URL(page.url());
  url.searchParams.set('usageTest', 'true');
  await page.goto(url.toString());
  await expect(getEditorLocator(page, {})).toBeVisible();
}
async function openSettings(page: Page) {
  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  return page.getByRole('radiogroup', { name: 'Share basic usage' });
}

test('counts meaningful reading and saved edits once per browser day across reloads', async ({
  page,
}) => {
  const summaries: Record<string, unknown>[] = [];
  await page.route('**/api/usage', async (route) => {
    summaries.push(route.request().postDataJSON());
    expect(route.request().headers().referer).toBeUndefined();
    await route.fulfill({ status: 204 });
  });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'usage-workspace',
    noteName: 'private-title',
  });
  await page.clock.install({ time: new Date('2026-09-19T12:00:00Z') });
  await startMeasurement(page);
  await page.clock.runFor(35_000);
  expect(summaries).toEqual([]);
  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.clock.runFor(20_000);
  await openSettings(page);
  await expect(editor).not.toBeVisible();
  await page.clock.runFor(35_000);
  expect(summaries).toEqual([]);
  await page.getByRole('link', { name: 'Back to app' }).click();
  await expect(editor).toBeVisible();
  await editor.click();
  await page.clock.runFor(25_000);
  expect(summaries).toEqual([]);
  await page.clock.runFor(5_000);
  await expect.poll(() => summaries.length).toBe(1);
  expect(summaries[0]).toEqual({
    version: 1,
    installationId: expect.any(String),
    day: '2026-09-19',
    read: true,
    edited: false,
  });
  await page.keyboard.insertText('Private content remains local');
  await page.clock.runFor(1_000);
  await expect.poll(() => summaries.length).toBe(2);
  expect(summaries[1]).toEqual({
    version: 1,
    installationId: summaries[0]?.installationId,
    day: '2026-09-19',
    read: true,
    edited: true,
  });
  await expect
    .poll(() => readStoredMarkdown(page, 'usage-workspace', 'private-title'))
    .toContain('Private content remains local');
  await page.reload();
  await expect(editor).toContainText('Private content remains local');
  await editor.click();
  await page.keyboard.insertText(' Another edit');
  await page.clock.runFor(35_000);
  expect(summaries).toHaveLength(2);
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00Z'));
  await page.keyboard.insertText(' Returned the next day');
  await page.clock.runFor(1_000);
  await expect.poll(() => summaries.length).toBe(3);
  expect(summaries[2]).toEqual({
    version: 1,
    installationId: summaries[0]?.installationId,
    day: '2026-09-20',
    read: false,
    edited: true,
  });
});

test('counts reading through the Wordgard editor readiness signal', async ({
  page,
}) => {
  const summaries: Record<string, unknown>[] = [];
  await page.route('**/api/usage', async (route) => {
    summaries.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'usage-wordgard',
    noteName: 'read-only-note',
  });
  await getEditorLocator(page, {}).click();
  await page.keyboard.insertText('Read this in either editor');
  await expect
    .poll(() => readStoredMarkdown(page, 'usage-wordgard', 'read-only-note'))
    .toContain('Read this in either editor');
  await page.clock.install({ time: new Date('2026-09-19T12:00:00Z') });
  const url = new URL(page.url());
  url.searchParams.set('usageTest', 'true');
  url.searchParams.set('editorEngine', 'wordgard');
  await page.goto(url.toString());
  const editor = page.locator('[data-editor-engine="wordgard"]');
  await expect(editor).toContainText('Read this in either editor');
  await page.clock.runFor(35_000);
  expect(summaries).toEqual([]);
  await editor.click();
  await page.clock.runFor(30_000);
  await expect.poll(() => summaries.length).toBe(1);
  expect(summaries[0]).toEqual({
    version: 1,
    installationId: expect.any(String),
    day: '2026-09-19',
    read: true,
    edited: false,
  });
  await expect
    .poll(() => readStoredMarkdown(page, 'usage-wordgard', 'read-only-note'))
    .toContain('Read this in either editor');
});

test('usage opt-out persists across reloads and is respected by another open tab', async ({
  page,
  context,
}) => {
  const summaries: Record<string, unknown>[] = [];
  await context.route('**/api/usage', async (route) => {
    summaries.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'usage-opt-out',
    noteName: 'my-note',
  });
  await startMeasurement(page);
  const second = await context.newPage();
  await second.goto(page.url());
  await expect(getEditorLocator(second, {})).toBeVisible();
  const preference = await openSettings(page);
  await expect(
    preference.getByRole('radio', { name: 'Enabled' }),
  ).toBeChecked();
  await preference.getByRole('radio', { name: 'Disabled' }).click();
  await page.reload();
  await expect(
    preference.getByRole('radio', { name: 'Disabled' }),
  ).toBeChecked();
  await second.bringToFront();
  const secondPreference = await openSettings(second);
  await expect(
    secondPreference.getByRole('radio', { name: 'Disabled' }),
  ).toBeChecked();
  await second.getByRole('link', { name: 'Back to app' }).click();
  await getEditorLocator(second, {}).click();
  await second.keyboard.insertText('Works with usage sharing disabled');
  await expect
    .poll(() => readStoredMarkdown(second, 'usage-opt-out', 'my-note'))
    .toContain('Works with usage sharing disabled');
  expect(summaries).toEqual([]);
  await second.reload();
  await expect(getEditorLocator(second, {})).toContainText(
    'Works with usage sharing disabled',
  );
});

test('an unavailable usage endpoint does not interrupt saving and retries after reload', async ({
  page,
}) => {
  let available = false;
  const summaries: Record<string, unknown>[] = [];
  await page.route('**/api/usage', async (route) => {
    summaries.push(route.request().postDataJSON());
    await route.fulfill({ status: available ? 204 : 503 });
  });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'usage-outage',
    noteName: 'offline-note',
  });
  await startMeasurement(page);
  await getEditorLocator(page, {}).click();
  await page.keyboard.insertText('A metrics outage must not lose this note');
  await expect.poll(() => summaries.length).toBe(1);
  await expect
    .poll(() => readStoredMarkdown(page, 'usage-outage', 'offline-note'))
    .toContain('A metrics outage must not lose this note');
  available = true;
  await page.reload();
  await expect(getEditorLocator(page, {})).toContainText(
    'A metrics outage must not lose this note',
  );
  await expect.poll(() => summaries.length).toBe(2);
  expect(summaries[1]).toEqual(summaries[0]);
});
