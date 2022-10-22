import { expect } from '@playwright/test';

import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import {
  createNewNote,
  createWorkspace,
  getEditorDebugString,
  getEditorLocator,
  longSleep,
  splitScreen,
} from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});
test.describe('collab', () => {
  test('Split screen and typing in secondary works', async ({ page }) => {
    const wsName = await createWorkspace(page);
    const wsPath = await createNewNote(page, wsName, 'test123');

    await splitScreen(page);

    let primaryText = await getEditorDebugString(page, PRIMARY_EDITOR_INDEX, {
      wsPath,
    });

    let secondaryText = await getEditorDebugString(
      page,
      SECONDARY_EDITOR_INDEX,
      { wsPath },
    );

    expect(primaryText).toMatchSnapshot({
      name: 'Split screen and typing in secondary works',
    });
    expect(secondaryText).toBe(primaryText);
    await longSleep();

    await page.keyboard.press('Enter');

    await page.keyboard.type('manthanoy', { delay: 10 });

    await longSleep();

    secondaryText = await getEditorDebugString(page, SECONDARY_EDITOR_INDEX, {
      wsPath,
    });

    expect(secondaryText).toMatch(/manthanoy/);
    primaryText = await getEditorDebugString(page, PRIMARY_EDITOR_INDEX, {
      wsPath,
    });
    expect(primaryText).toBe(secondaryText);
  });

  test('Split screen and typing in primary works', async ({ page }) => {
    const wsName = await createWorkspace(page);
    const wsPath = await createNewNote(page, wsName, 'test123');

    await splitScreen(page);

    await getEditorLocator(page, SECONDARY_EDITOR_INDEX, {
      focus: true,
      wsPath,
    });

    const primary = await getEditorLocator(page, PRIMARY_EDITOR_INDEX, {
      focus: true,
      wsPath,
    });

    await primary.press('Enter', { delay: 10 });

    await primary.type('manthanoy', { delay: 10 });

    await longSleep();

    let primaryText = await getEditorDebugString(page, PRIMARY_EDITOR_INDEX);
    expect(primaryText).toMatch(/manthanoy/);

    let secondaryText = await getEditorDebugString(
      page,
      SECONDARY_EDITOR_INDEX,
    );
    expect(secondaryText).toMatch(/manthanoy/);
    primaryText = await getEditorDebugString(page, PRIMARY_EDITOR_INDEX);
    expect(primaryText).toBe(secondaryText);
  });
});
