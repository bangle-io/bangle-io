import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { EditorIssueButton } from './EditorIssueButton';

export default {
  title: 'activitybar/EditorIssueButton',
  component: EditorIssueButton,
  argTypes: {},
};

const Template: Story<Parameters<typeof EditorIssueButton>[0]> = (args) => {
  return (
    <div style={{ width: 400 }}>
      <EditorIssueButton {...args}></EditorIssueButton>
    </div>
  );
};

export const Vanilla = Template.bind({});

Vanilla.args = {
  editorIssue: {
    title: 'This is a test',
    severity: 'error',
    serialOperation: 'operation::something',
    uid: '123',
    description: undefined,
    wsPath: 'test:one.md',
  },
  widescreen: false,
};
