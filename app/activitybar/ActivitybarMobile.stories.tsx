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

const Template: Story = (args) => {
  const { store } = createBasicStore({
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
        <ActivitybarMobile />
      </div>
    </TestStoreProvider>
  );
};

export const Vanilla = Template.bind({});
