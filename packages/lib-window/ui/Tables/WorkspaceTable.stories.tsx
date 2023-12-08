import { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { WorkspaceInfo } from '@bangle.io/shared-types';

import { WorkspaceTable } from './WorkspaceTable';

const meta: Meta<typeof WorkspaceTable> = {
  title: 'WorkspaceTable',
  component: WorkspaceTable,
};

export default meta;

type Story = StoryObj<typeof WorkspaceTable>;

// Mock data for the stories
const mockWorkspaces: WorkspaceInfo[] = [
  {
    name: 'Workspace 1',
    type: 'Type A',
    lastModified: new Date('2023-01-01').getTime(),
    metadata: {},
  },
  {
    name: 'Workspace 2',
    type: 'Type B',
    lastModified: new Date('2023-01-02').getTime(),
    metadata: {},
  },
  {
    name: 'Workspace 3',
    type: 'Type A',
    lastModified: new Date('2023-01-03').getTime(),
    metadata: {},
  },
];

export const Default: Story = {
  args: {
    widescreen: true,
    workspaces: mockWorkspaces,
    selectedKey: undefined,
    updateSelectedKey: (key: string) => console.log(`Selected key: ${key}`),
    goToWorkspace: (ws) => console.log(`Go to workspace: ${ws.name}`),
    createWorkspace: () => console.log('Create new workspace'),
  },
};

export const SmallscreenView = {
  args: {
    ...Default.args,
    widescreen: false,
  },
};

export const EmptyState = {
  args: {
    ...Default.args,
    workspaces: [],
  },
};
