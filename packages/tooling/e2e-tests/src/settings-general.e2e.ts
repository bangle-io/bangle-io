import { expect, test } from '@playwright/test';
import { createBrowserWorkspaceAndNote } from './common';

test('general settings update and persist user preferences', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await expect(
    page.getByRole('menuitem', { name: 'Change Theme' }),
  ).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'Settings' }).click();

  await expect(page.getByRole('link', { name: 'Back to app' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(
    page.getByRole('heading', { exact: true, name: 'App' }),
  ).toBeVisible();
  await expect(page.getByTestId('app-version')).toHaveText(
    /^\d+\.\d+\.\d+(?:[-+].*)?$/,
  );
  await expect(page.getByRole('button', { name: 'Install app' })).toHaveCount(
    0,
  );

  await page.getByRole('combobox', { name: 'Theme preference' }).click();
  await page.getByRole('option', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    'BU_dark-scheme',
  );

  const defaultWidth = page.getByRole('radio', { name: 'Default' });
  const wideWidth = page.getByRole('radio', { name: 'Wide' });
  await expect(wideWidth).toBeChecked();
  await defaultWidth.click();
  await expect(defaultWidth).toBeChecked();
  await expect(wideWidth).not.toBeChecked();

  await page.getByRole('combobox', { name: 'Asset location' }).click();
  await page.getByRole('option', { name: 'Adjacent to note' }).click();

  await page.reload({ waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    'BU_dark-scheme',
  );
  await expect(
    page.getByRole('combobox', { name: 'Theme preference' }),
  ).toContainText('Dark');
  await expect(
    page.getByRole('combobox', { name: 'Asset location' }),
  ).toContainText('Adjacent to note');
  await expect(page.getByRole('radio', { name: 'Default' })).toBeChecked();
});

test('general settings returns to the route it was opened from', async ({
  page,
}) => {
  const workspaceName = 'settings-return-workspace';
  const noteName = 'settings-return-note';

  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  await expect(
    page
      .getByLabel('breadcrumb')
      .getByRole('button', { name: `${noteName}.md` }),
  ).toBeVisible();

  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();

  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();

  await page.getByRole('link', { name: 'Back to app' }).click();

  await expect(
    page
      .getByLabel('breadcrumb')
      .getByRole('button', { name: `${noteName}.md` }),
  ).toBeVisible();
});

test('general settings rejects an external return target after path normalization', async ({
  page,
}) => {
  const hash = new URLSearchParams({
    route: 'settings-general',
    returnTo: '/foo/..//evil.example/path',
  });

  await page.goto(`/#${hash.toString()}`);
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();

  const backLink = page.getByRole('link', { name: 'Back to app' });
  const href = await backLink.getAttribute('href');
  expect(href).not.toBeNull();
  expect(new URL(href ?? '', page.url()).origin).toBe(
    new URL(page.url()).origin,
  );

  await backLink.click();
  await expect(page).toHaveURL(/#route=welcome$/);
});
