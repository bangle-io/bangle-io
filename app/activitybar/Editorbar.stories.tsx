import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';

import { Editorbar } from './Editorbar';

export default {
  title: 'activitybar/Editorbar',
  component: Editorbar,
  argTypes: {},
};

const Template: Story<Parameters<typeof Editorbar>[0]> = (args) => {
  return (
    <div style={{ width: 400 }}>
      <Editorbar {...args}></Editorbar>
    </div>
  );
};

export const Vanilla = Template.bind({});

Vanilla.args = {
  wsPath: 'test-ws:one.md',
  isActive: true,
  showSplitEditor: false,
  onClose: () => {},
  onPressSecondaryEditor: () => {},
  isSplitEditorOpen: false,
  openNotesPalette: () => {},
};

export const Branching = Template.bind({});

Branching.args = {
  wsPath: 'test-ws:one/own.md',
  isActive: true,
  showSplitEditor: false,
  onClose: () => {},
  onPressSecondaryEditor: () => {},
  isSplitEditorOpen: false,
  openNotesPalette: () => {},
};

export const ShowingSplitEditor = Template.bind({});

ShowingSplitEditor.args = {
  wsPath: 'test-ws:one/own.md',
  isActive: true,
  showSplitEditor: true,
  onClose: () => {},
  onPressSecondaryEditor: () => {},
  isSplitEditorOpen: true,
  openNotesPalette: () => {},
};
export const WithEditorIssue = Template.bind({});

WithEditorIssue.args = {
  wsPath: 'test-ws:one/own.md',
  isActive: true,
  showSplitEditor: true,
  onClose: () => {},
  onPressSecondaryEditor: () => {},
  isSplitEditorOpen: true,
  openNotesPalette: () => {},
  editorIssue: {
    title: 'This is a test',
    severity: 'error',
    serialOperation: 'operation::something',
    uid: '123',
    description: undefined,
    wsPath: 'test:one.md',
  },
};
