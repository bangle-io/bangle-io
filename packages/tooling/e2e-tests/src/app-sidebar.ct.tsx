import { AppSidebarExample } from '@bangle.io/ui-components/src/app-sidebar.stories.tsx';
import { expect, test } from '@playwright/experimental-ct-react';
import type { Locator, Page } from '@playwright/test';
import React from 'react';

test('Collapsing file', async ({ mount }) => {
  const component = await mount(<AppSidebarExample />);

  await component.getByText('Files').scrollIntoViewIfNeeded();
  await component.getByText('Files').click();
  await component.getByRole('button', { name: 'components' }).click();

  await expect(component).toHaveScreenshot();
  await component.getByRole('button', { name: 'components' }).click();
  await expect(component).toHaveScreenshot();
});

test('Toggle sidebar', async ({ mount }) => {
  const component = await mount(<AppSidebarExample />);

  await component.getByRole('button', { name: 'Toggle Sidebar' }).click();

  await expect(component).toHaveScreenshot();

  await component.getByRole('button', { name: 'Toggle Sidebar' }).click();

  await expect(component).toHaveScreenshot();
});
