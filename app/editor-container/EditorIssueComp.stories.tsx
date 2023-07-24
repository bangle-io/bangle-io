import './style';

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { SEVERITY } from '@bangle.io/constants';

import { EditorIssueComp } from './EditorIssueComp';

const meta: Meta<typeof EditorIssueComp> = {
  title: 'editor-container/EditorIssueComp',
  component: EditorIssueComp,
  argTypes: {},
  decorators: [
    (Story) => {
      return (
        <div style={{ width: 400 }}>
          <Story />
        </div>
      );
    },
  ],
};

type Story = StoryObj<typeof EditorIssueComp>;

export default meta;

export const Error: Story = {
  args: {
    editorIssue: {
      title: 'This is a test',
      severity: SEVERITY.ERROR,
      serialOperation: 'operation::something',
      uid: '123',
      description: 'something went wrong',
      wsPath: 'test:one.md',
    },
    onPress: () => {},
  },
};

export const Warning: Story = {
  args: {
    editorIssue: {
      title: 'This is a test',
      severity: SEVERITY.WARNING,
      serialOperation: 'operation::something',
      uid: '123',
      description: 'something went wrong',
      wsPath: 'test:one.md',
    },
    onPress: () => {},
  },
};
