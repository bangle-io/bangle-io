import type { Story } from '@storybook/react';
import React from 'react';

import { Editorbar } from './Editorbar';

export default {
  title: 'editorbar/Editorbar',
  component: Editorbar,
  argTypes: {},
};

const Template: Story<Parameters<typeof Editorbar>[0]> = (args) => {
  return <Editorbar {...args}></Editorbar>;
};

export const Primary = Template.bind({});

Primary.args = {
  wsPath: 'test-ws:one.md',
  isActive: false,
  showSplitEditor: false,
  onClose: () => {},
  onPressSecondaryEditor: () => {},
  isSplitEditorOpen: false,
  openNotesPalette: () => {},
};
