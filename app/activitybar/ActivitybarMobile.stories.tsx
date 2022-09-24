import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import { createBasicStore, TestStoreProvider } from '@bangle.io/test-utils';

import { ActivitybarMobile } from './ActivitybarMobile';

export default {
  title: 'activitybar/ActivitybarMobile',
  component: ActivitybarMobile,
  argTypes: {},
};

const Template: Story<Parameters<typeof ActivitybarMobile>[0]> = (args) => {
  const { store } = createBasicStore({
    storageProvider: 'in-memory',
  });

  return (
    <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
      <div style={{ width: 400 }}>
        <ActivitybarMobile {...args} />
      </div>
    </TestStoreProvider>
  );
};

export const Vanilla = Template.bind({});

Vanilla.args = {
  operationKeybindings: {},
  sidebarItems: [],
  activeSidebar: undefined,
  editingAllowed: true,
  primaryWsPath: undefined,
  wsName: undefined,
};
