import { expect, test } from '@playwright/test';

import {
  getEditorLocator,
  sleep,
  waitForEditorTextToContain,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

test('Landing page is correct', async ({ page }) => {
  const handle = await getEditorLocator(page, 0);

  await waitForEditorTextToContain(page, 0, 'short guide');

  const result = await handle.evaluate((node: any) => node.innerText);
  expect(result).toMatchSnapshot('landing page');
});
