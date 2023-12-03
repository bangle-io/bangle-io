import { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { resolvePath } from '@bangle.io/ws-path'; // Adjust import as necessary

import { FilesTable } from './FilesTable';

const meta: Meta<typeof FilesTable> = {
  title: 'FilesTable',
  component: FilesTable,
};

export default meta;

type Story = StoryObj<typeof FilesTable>;

// Mock data for the stories
const mockWsPathsInfo = [
  {
    wsPath: 'test-ws:path/to/file1',
  },
  {
    wsPath: 'test-ws:path/to/file2',
  },
  {
    wsPath: 'test-ws:path/to/file3',
  },
];

export const Default: Story = {
  args: {
    wsName: 'Workspace 1',
    widescreen: true,
    wsPathsInfo: mockWsPathsInfo.map((r) => {
      return {
        ...resolvePath(r.wsPath),
      };
    }),
    selectedKey: undefined,
    updateSelectedKey: (key: string) => console.log(`Selected key: ${key}`),
    goToWsPath: (wsPath: string) => console.log(`Go to wsPath: ${wsPath}`),
    createNote: () => console.log('Create new note'),
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
    wsPathsInfo: [],
  },
};
