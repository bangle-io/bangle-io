import { expect } from '@playwright/test';

import { test } from '../../fixture-with-bangle';

test.beforeEach(async ({ bangleApp }) => {
  await bangleApp.open();
});

test('html element has the correct classes', async ({ page }) => {
  // Get the class attribute of the html element
  const classAttribute = await page.evaluate(
    () => document.documentElement.className,
  );

  expect(classAttribute.split(' ')).toContain('BU_widescreen');
  expect(classAttribute.split(' ')).toContain('light-scheme');
});

test('has smallscreen on smaller viewport', async ({ page, bangleApp }) => {
  await page.setViewportSize({ width: 400, height: 600 });

  await bangleApp.open();

  // Get the class attribute of the html element
  const classAttribute = await page.evaluate(
    () => document.documentElement.className,
  );

  expect(classAttribute.split(' ')).toContain('BU_smallscreen');
});
