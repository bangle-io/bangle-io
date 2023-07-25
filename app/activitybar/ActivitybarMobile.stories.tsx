import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { useNsmPlainStore } from '@bangle.io/bangle-store-context';
import { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import { storybookStoreDecorator } from '@bangle.io/test-utils-2';

import { ActivitybarMobileDumb } from './ActivitybarMobile';

function WrappedActivitybarMobileDumb(
  props: Parameters<typeof ActivitybarMobileDumb>[0],
) {
  const nsmStore = useNsmPlainStore();
  const { extensionRegistry } = nsmExtensionRegistry.get(nsmStore.state);

  return (
    <ActivitybarMobileDumb {...props} extensionRegistry={extensionRegistry} />
  );
}

const meta: Meta<typeof ActivitybarMobileDumb> = {
  title: 'activitybar/ActivitybarMobile',
  component: WrappedActivitybarMobileDumb,
  argTypes: {},
  parameters: {
    viewport: {
      defaultViewport: 'smallscreen',
    },
  },
  decorators: [
    storybookStoreDecorator({
      core: {
        page: true,
        workspace: true,
        ui: true,
      },
    }),
  ],
};

export default meta;

type Story = StoryObj<typeof WrappedActivitybarMobileDumb>;

export const Vanilla: Story = {
  args: {
    primaryWsPath:
      'test:one/own/long/path/one-two-three-four-five-six-seven-eight.md',
  },
};
