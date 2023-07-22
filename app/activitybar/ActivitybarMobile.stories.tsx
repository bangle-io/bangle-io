import type { Story } from '@storybook/react';
import React from 'react';

import { createBasicStore, TestStoreProvider } from '@bangle.io/test-utils';

import { ActivitybarMobileDumb } from './ActivitybarMobile';

export default {
  title: 'activitybar/ActivitybarMobile',
  component: ActivitybarMobileDumb,
  argTypes: {},
};

const Template: Story<Partial<Parameters<typeof ActivitybarMobileDumb>[0]>> = (
  args,
) => {
  const { store, extensionRegistry } = createBasicStore({
    storageProvider: 'in-memory',
    useEditorManagerSlice: true,
    useUISlice: true,
    overrideInitialSliceState: {
      // @ts-expect-error
      uiSlice: {
        widescreen: false,
      },
    },
  });

  const finalArgs = {
    bangleStore: store,
    primaryWsPath: 'test:one.md',
    wsName: 'test',
    showDone: false,
    extensionRegistry: extensionRegistry,
    activeSidebar: 'notes',
    ...args,
  };

  return (
    <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
      <div style={{ width: 400 }}>
        {/** @ts-expect-error  */}
        <ActivitybarMobileDumb {...finalArgs} />
      </div>
    </TestStoreProvider>
  );
};

export const Vanilla = Template.bind({});

export const WithLongWsPath = Template.bind({});
WithLongWsPath.args = {
  primaryWsPath:
    'test:one/own/long/path/one-two-three-four-five-six-seven-eight.md',
};
