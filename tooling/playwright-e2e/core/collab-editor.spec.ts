import { expect, test } from '@playwright/test';

import {
  createNewNote,
  createWorkspace,
  ctrlKey,
  getEditorLocator,
  longSleep,
  sleep,
  getEditorDebugString,
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

    await page.pause();

    let primaryText = await getEditorDebugString(page, 0);
    await longSleep();

    let secondaryText = await getEditorDebugString(page, 1);

    expect(primaryText).toMatchSnapshot({
      name: 'Split screen and typing in secondary works',
    });
    expect(secondaryText).toBe(primaryText);

    await longSleep();

    await page.keyboard.press('Enter');

    await page.keyboard.type('manthanoy', { delay: 10 });
    await longSleep();

    secondaryText = await getEditorDebugString(page, 1);
    expect(secondaryText).toMatch(/manthanoy/);
    primaryText = await getEditorDebugString(page, 0);
    expect(primaryText).toBe(secondaryText);
  });

  test('Split screen and typing in primary works', async ({ page }) => {
    const wsName = await createWorkspace(page);
    await createNewNote(page, wsName, 'test123');

    await page.keyboard.down(ctrlKey);
    await page.keyboard.press('\\');
    await page.keyboard.up(ctrlKey);

    const primary = await getEditorLocator(page, 0, { focus: true });

    await primary.press('Enter', { delay: 10 });
    await sleep();

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
