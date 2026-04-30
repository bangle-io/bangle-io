import { MainContent } from '@bangle.io/ui-components/src/Dhancha/Dhancha.stories.tsx';
import { expect, test } from '@playwright/experimental-ct-react';
import React from 'react';

test.setTimeout(20_000);

test('changes the image', async ({ mount }) => {
  const component = await mount(<MainContent />);

  await expect(component).toHaveScreenshot({
    maxDiffPixelRatio: 0.12,
    timeout: 20_000,
  });
});
