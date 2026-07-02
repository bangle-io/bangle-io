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

  await page.getByRole('button', { name: 'Theme preference' }).click();
  await page.getByRole('menuitemradio', { name: 'Dark' }).click();
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

  await page.reload({ waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    'BU_dark-scheme',
  );
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
