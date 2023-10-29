import { expect } from '@playwright/test';

import { test } from '../fixture-with-bangle';

test.beforeEach(async ({ bangleApp }) => {
  await bangleApp.open();
});

test('has bangle in title', async ({ page }) => {
  await expect(page).toHaveTitle(/bangle/i);
});
