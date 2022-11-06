import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import { Editorbar } from './Editorbar';

export default {
  title: 'editor-container/Editorbar',
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
  onEnableEditing: () => {},
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
  onEnableEditing: () => {},
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
  onEnableEditing: () => {},
};

export const EditingDisabledEditor = Template.bind({});

EditingDisabledEditor.args = {
  wsPath: 'test-ws:one/own.md',
  isActive: true,
  editingDisabled: true,
  onClose: () => {},
  onPressSecondaryEditor: () => {},
  openNotesPalette: () => {},
  onEnableEditing: () => {},
};
