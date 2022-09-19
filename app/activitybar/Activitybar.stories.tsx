import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import { createBasicStore, TestStoreProvider } from '@bangle.io/test-utils';

import { Activitybar } from './Activitybar';

export default {
  title: 'activitybar/Activitybar',
  component: Activitybar,
  argTypes: {},
};

const Template: Story<Parameters<typeof Activitybar>[0]> = (args) => {
  const { store } = createBasicStore({
    storageProvider: 'in-memory',
    useUISlice: true,
    useEditorManagerSlice: true,
  });

  return (
    <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
      <div
        style={{
          width: 50,
          height: 500,
          flexDirection: 'column',
          display: 'flex',
        }}
      >
        <Activitybar {...args} />
      </div>
    </TestStoreProvider>
  );
};

export const Vanilla = Template.bind({});

Vanilla.args = {
  operationKeybindings: {},
  primaryWsPath: undefined,
  sidebars: [],
  wsName: undefined,
};
