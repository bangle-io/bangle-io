import './style';

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { createWsPath } from '@bangle.io/ws-path';

import { Editorbar } from './Editorbar';

const meta: Meta<typeof Editorbar> = {
  title: 'editor-container/Editorbar',
  component: Editorbar,
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
type Story = StoryObj<typeof Editorbar>;

export default meta;

export const Vanilla: Story = {
  args: {
    wsPath: createWsPath('test-ws:one.md'),
    isActive: true,
    showSplitEditor: false,
    onClose: () => {},
    onPressSecondaryEditor: () => {},
    isSplitEditorOpen: false,
    openNotesPalette: () => {},
    onEnableEditing: () => {},
  },
};

export const Branching: Story = {
  args: {
    wsPath: createWsPath('test-ws:one/own.md'),
    isActive: true,
    showSplitEditor: false,
    onClose: () => {},
    onPressSecondaryEditor: () => {},
    isSplitEditorOpen: false,
    openNotesPalette: () => {},
    onEnableEditing: () => {},
  },
};

export const ShowingSplitEditor: Story = {
  args: {
    wsPath: createWsPath('test-ws:one/own.md'),
    isActive: true,
    showSplitEditor: true,
    onClose: () => {},
    onPressSecondaryEditor: () => {},
    isSplitEditorOpen: true,
    openNotesPalette: () => {},
    onEnableEditing: () => {},
  },
};

export const EditingDisabledEditor: Story = {
  args: {
    wsPath: createWsPath('test-ws:one/own.md'),
    isActive: true,
    editingDisabled: true,
    onClose: () => {},
    onPressSecondaryEditor: () => {},
    openNotesPalette: () => {},
    onEnableEditing: () => {},
  },
};
