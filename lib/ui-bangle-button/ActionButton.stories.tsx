import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import { ActionButton } from './ActionButton';
import { ButtonContent } from './ButtonContent';

export default {
  title: 'ui-bangle-button/ActionButton',
  component: ActionButton,

  argTypes: {
    backgroundColor: { control: 'color' },
  },
};

export const Primary: Story<Parameters<typeof ActionButton>[0]> = (args) => {
  return (
    <ActionButton {...args}>
      <ButtonContent text="hi brothers from another mother" size="medium" />
    </ActionButton>
  );
};

Primary.args = {
  ariaLabel: 'hi brother',
};
