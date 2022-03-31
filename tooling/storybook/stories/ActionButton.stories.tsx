import '@bangle.io/ui-bangle-button/style';

import { Story } from '@storybook/react';
import React from 'react';

import ActionButton, { ButtonContent } from './ActionButton';

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: 'Example/Button',
  component: ActionButton,

  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    backgroundColor: { control: 'color' },
  },
};

// export const Primary = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args

export const Primary: Story<Parameters<typeof ActionButton>[0]> = (args) => {
  return (
    <ActionButton {...args}>
      <ButtonContent text="hi" />
    </ActionButton>
  );
};

Primary.args = {
  ariaLabel: 'hi',
};

// export const Secondary = Template.bind({});
// Secondary.args = {
//   label: 'Button',
// };

// export const Large = Template.bind({});
// Large.args = {
//   size: 'large',
//   label: 'Button',
// };

// export const Small = Template.bind({});
// Small.args = {
//   size: 'small',
//   label: 'Button',
// };
