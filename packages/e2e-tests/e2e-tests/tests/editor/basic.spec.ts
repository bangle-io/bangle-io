import { expect } from '@playwright/test';

import { test } from '../../fixture-with-bangle';
import { sleep } from '../utils';

test.beforeEach(async ({ bangleApp }) => {
  await bangleApp.open();
});

test('test', async ({ page }) => {
  const workspaceName = 'test-ws-1';
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByLabel(/Workspace Name/).fill(workspaceName);
  await page.getByLabel(/Workspace Name/).press('Enter');
  await page.getByText(workspaceName).click();
  await page.getByRole('button', { name: 'New', exact: true }).click();

  await sleep(50);

  const elements = await page.$$('div[data-key]');

  expect(elements.length).toBeGreaterThan(1);

  let clicked = false;
  for (const element of elements) {
    const value = await element.getAttribute('data-key');

    if (value?.startsWith(workspaceName)) {
      await element.dblclick();
      clicked = true;
      break;
    }
  }

  expect(clicked).toBe(true);

  await page.waitForURL('**/*.md');

  await page.waitForSelector('.ProseMirror', { state: 'visible' });
});
