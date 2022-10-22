import { expect } from '@playwright/test';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { withBangle as test } from '../fixture-with-bangle';
import { getEditorLocator, waitForEditorTextToContain } from '../helpers';

test.beforeEach(async ({ bangleApp }, testInfo) => {
  await bangleApp.open();
});

test('Landing page is correct', async ({ page }) => {
  const handle = await getEditorLocator(page, PRIMARY_EDITOR_INDEX);

  await waitForEditorTextToContain(page, PRIMARY_EDITOR_INDEX, 'short guide');

  const result = await handle.evaluate((node: any) => node.innerText);
  expect(result).toMatchSnapshot('landing page');
});
