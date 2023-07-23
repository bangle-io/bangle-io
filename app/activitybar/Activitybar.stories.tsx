import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Extension } from '@bangle.io/extension-registry';
import { storybookStoreDecorator } from '@bangle.io/test-utils-2';
import { FolderIcon } from '@bangle.io/ui-components';

import { Activitybar } from './Activitybar';

const meta: Meta<typeof Activitybar> = {
  title: 'activitybar/Activitybar',
  component: Activitybar,
  argTypes: {},
  decorators: [
    (Story) => (
      <div
        style={{
          width: 50,
          height: 500,
          flexDirection: 'column',
          display: 'flex',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Activitybar>;

export const Vanilla: Story = {
  decorators: [
    storybookStoreDecorator({
      core: {
        page: true,
        workspace: true,
      },
    }),
  ],
};

export const WithSidebarItems: Story = {
  decorators: [
    storybookStoreDecorator({
      core: {
        page: true,
        workspace: true,
      },
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
    }),
  ],
};
