import { expect, test } from '@playwright/test';

import {
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  getEditorLocator,
  longSleep,
  splitScreen,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});
test.describe('collab', () => {
  test('Split screen and typing in secondary works', async ({ page }) => {
    const wsName = await createWorkspace(page);
    const wsPath = await createNewNote(page, wsName, 'test123');

    await splitScreen(page);

    let primaryText = await getEditorDebugString(page, 0, { wsPath });

    let secondaryText = await getEditorDebugString(page, 1, { wsPath });

    expect(primaryText).toMatchSnapshot({
      name: 'Split screen and typing in secondary works',
    });
    expect(secondaryText).toBe(primaryText);

    await page.keyboard.press('Enter');

    await page.keyboard.type('manthanoy', { delay: 10 });

    await longSleep();

    secondaryText = await getEditorDebugString(page, 1, { wsPath });
    expect(secondaryText).toMatch(/manthanoy/);
    primaryText = await getEditorDebugString(page, 0, { wsPath });
    expect(primaryText).toBe(secondaryText);
  });

  test('Split screen and typing in primary works', async ({ page }) => {
    const wsName = await createWorkspace(page);
    const wsPath = await createNewNote(page, wsName, 'test123');

    await splitScreen(page);

    await getEditorLocator(page, 1, { focus: true, wsPath });

    const primary = await getEditorLocator(page, 0, { focus: true, wsPath });

    await primary.press('Enter', { delay: 10 });

    await primary.type('manthanoy', { delay: 10 });

    await longSleep();

    let primaryText = await getEditorDebugString(page, 0);
    expect(primaryText).toMatch(/manthanoy/);

    let secondaryText = await getEditorDebugString(page, 1);
    expect(secondaryText).toMatch(/manthanoy/);
    primaryText = await getEditorDebugString(page, 0);
    expect(primaryText).toBe(secondaryText);
  });
});
