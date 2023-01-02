import type { Story } from '@storybook/react';
import React from 'react';

import { Extension } from '@bangle.io/extension-registry';
import type { BangleApplicationStore } from '@bangle.io/shared-types';
import { createBasicStore, TestStoreProvider } from '@bangle.io/test-utils';
import { FolderIcon } from '@bangle.io/ui-components';

import { Activitybar } from './Activitybar';

export default {
  title: 'activitybar/Activitybar',
  component: Activitybar,
  argTypes: {},
};

export const Vanilla: Story<{ store: BangleApplicationStore }> = () => {
  let { store } = createBasicStore({
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
        <Activitybar />
      </div>
    </TestStoreProvider>
  );
};
export const WithSidebarItem: Story<{ store: BangleApplicationStore }> = () => {
  let { store } = createBasicStore({
    storageProvider: 'in-memory',
    useUISlice: true,
    useEditorManagerSlice: true,
    extensions: [
      Extension.create({
        name: 'test-ext-123',
        application: {
          sidebars: [
            {
              name: 'sidebar::test-ext-123:sidebar-123',
              title: 'folder sidebar',
              activitybarIcon: React.createElement(FolderIcon, {}),
              ReactComponent: () => <p>hello notes</p>,
              hint: 'I am a folder sidebar',
            },
          ],
        },
      }),
    ],
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
        <Activitybar />
      </div>
    </TestStoreProvider>
  );
};
