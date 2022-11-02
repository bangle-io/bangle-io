import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import { createBasicStore, TestStoreProvider } from '@bangle.io/test-utils';

import { ActivitybarMobileDumb } from './ActivitybarMobile';

export default {
  title: 'activitybar/ActivitybarMobile',
  component: ActivitybarMobileDumb,
  argTypes: {},
};

const Template: Story = (args) => {
  const { store, extensionRegistry } = createBasicStore({
    storageProvider: 'in-memory',
    useEditorManagerSlice: true,
    useUISlice: true,
    overrideInitialSliceState: {
      uiSlice: {
        widescreen: false,
      },
    },
  });

  return (
    <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
      <div style={{ width: 400 }}>
        <ActivitybarMobileDumb
          bangleStore={store}
          primaryWsPath={'test:one.md'}
          wsName={'test'}
          showDone={false}
          extensionRegistry={extensionRegistry}
          activeSidebar={'notes'}
        />
      </div>
    </TestStoreProvider>
  );
};

export const Vanilla = Template.bind({});
