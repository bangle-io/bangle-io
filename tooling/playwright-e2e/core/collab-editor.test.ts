import { expect, test } from '@playwright/test';

import {
  createNewNote,
  createWorkspace,
  ctrlKey,
  getPrimaryEditorDebugString,
  getPrimaryEditorHandler,
  getSecondaryEditorDebugString,
  longSleep,
  sleep,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test.describe.parallel('collab', () => {
  test('Split screen and typing in secondary works', async ({ page }) => {
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'test123');

    await page.keyboard.down(ctrlKey);
    await page.keyboard.press('\\');
    await page.keyboard.up(ctrlKey);

    await longSleep();

    let primaryText = await getPrimaryEditorDebugString(page);
    let secondaryText = await getSecondaryEditorDebugString(page);

    expect(primaryText).toMatchSnapshot({
      name: 'Split screen and typing in secondary works',
    });
    expect(secondaryText).toBe(primaryText);

    await longSleep();

    await page.keyboard.press('Enter');

    await page.keyboard.type('manthanoy', { delay: 10 });
    await longSleep();

    secondaryText = await getSecondaryEditorDebugString(page);
    expect(secondaryText).toMatch(/manthanoy/);
    primaryText = await getPrimaryEditorDebugString(page);
    expect(primaryText).toBe(secondaryText);
  });

  test('Split screen and typing in primary works', async ({ page }) => {
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'test123');

    await page.keyboard.down(ctrlKey);
    await page.keyboard.press('\\');
    await page.keyboard.up(ctrlKey);

    const primaryHandle = await getPrimaryEditorHandler(page, { focus: true });
    await longSleep();
    await primaryHandle.press('Enter');

    await primaryHandle.type('manthanoy', { delay: 10 });

    await longSleep();

    let primaryText = await getPrimaryEditorDebugString(page);
    expect(primaryText).toMatch(/manthanoy/);

    let secondaryText = await getSecondaryEditorDebugString(page);
    expect(secondaryText).toMatch(/manthanoy/);
    primaryText = await getPrimaryEditorDebugString(page);
    expect(primaryText).toBe(secondaryText);
  });
});
