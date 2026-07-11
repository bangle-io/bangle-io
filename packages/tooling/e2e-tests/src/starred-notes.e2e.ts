import { expect, test } from '@playwright/test';
import { createBrowserWorkspaceAndNote } from './common';

test('starred notes stay visible, ordered, navigable, and persisted in the sidebar', async ({
  page,
}) => {
  const workspaceName = 'starred-sidebar-ws';
  const firstNoteName =
    'a-deliberately-long-starred-note-name-that-must-not-widen-the-sidebar';
  const secondNoteName = 'second-starred-note';

  await page.setViewportSize({ width: 1280, height: 800 });
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: firstNoteName,
  });

  await expect(page.getByText('Starred', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Star this item' }).click();

  const starredSection = page
    .getByText('Starred', { exact: true })
    .locator('..');
  const starredLinks = starredSection.getByRole('link');
  const firstStarredLink = starredSection.getByRole('link', {
    name: `${firstNoteName}.md`,
  });
  await expect(page.getByText('Starred', { exact: true })).toBeVisible();
  await expect(firstStarredLink).toBeVisible();

  const sidebar = page.locator('[data-sidebar="sidebar"]').first();
  const sidebarWidthBefore = (await sidebar.boundingBox())?.width;
  expect(sidebarWidthBefore).toBeDefined();
  await expect
    .poll(async () => (await sidebar.boundingBox())?.width)
    .toBe(sidebarWidthBefore);

  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'New Note' }).click();
  await page.getByLabel('Note name').fill(secondNoteName);
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: 'Star this item' }).click();

  await expect(starredLinks).toHaveCount(2);
  await expect(starredLinks.nth(0)).toHaveAccessibleName(`${firstNoteName}.md`);
  await expect(starredLinks.nth(1)).toHaveAccessibleName(
    `${secondNoteName}.md`,
  );
  await expect(starredLinks.nth(1)).toHaveAttribute('aria-current', 'page');

  await firstStarredLink.click();
  await expect(firstStarredLink).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('button', { name: `${firstNoteName}.md` }),
  ).toBeVisible();

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByText('Starred', { exact: true })).toBeVisible();
  await expect(starredLinks).toHaveCount(2);
  await expect(starredLinks.nth(0)).toHaveAccessibleName(`${firstNoteName}.md`);
  await expect(starredLinks.nth(1)).toHaveAccessibleName(
    `${secondNoteName}.md`,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
  const mobileSidebar = page.getByRole('dialog', { name: 'Sidebar' });
  await expect(mobileSidebar).toBeVisible();
  await mobileSidebar
    .getByText('Starred', { exact: true })
    .locator('..')
    .getByRole('link', { name: `${secondNoteName}.md` })
    .click();
  await expect(mobileSidebar).toBeHidden();
  await expect(
    page.getByRole('button', { name: `${secondNoteName}.md` }),
  ).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await firstStarredLink.click();

  await page.getByRole('button', { name: 'Unstar this item' }).click();
  await expect(firstStarredLink).toHaveCount(0);
  await expect(page.getByText('Starred', { exact: true })).toBeVisible();

  await starredLinks.first().click();
  await page.getByRole('button', { name: 'Unstar this item' }).click();
  await expect(page.getByText('Starred', { exact: true })).toHaveCount(0);
});
