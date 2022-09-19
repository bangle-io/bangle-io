import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import { Editorbar } from './Editorbar';

export default {
  title: 'editorbar/Editorbar',
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

export const Primary = Template.bind({});

Primary.args = {
  wsPath: 'test-ws:one.md',
  isActive: true,
  showSplitEditor: false,
  onClose: () => {},
  onPressSecondaryEditor: () => {},
  isSplitEditorOpen: false,
  openNotesPalette: () => {},
};
