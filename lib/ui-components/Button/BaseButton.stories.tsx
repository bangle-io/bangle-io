import '../style';

import type { Story } from '@storybook/react';
import React from 'react';

import { BaseButton } from './BaseButton';

export default {
  title: 'ui-components/BaseButton',
  component: BaseButton,
  argTypes: {},
};

const Template: Story<Parameters<typeof BaseButton>[0]> = (args) => {
  return <BaseButton {...args}>Hello</BaseButton>;
};

export const Primary = Template.bind({});

Primary.args = {
  isHovered: true,
  isPressed: true,
  animateOnPress: true,
};

export const Secondary = Template.bind({});

Secondary.args = {};
