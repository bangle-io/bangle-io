import '../style';

import type { Story } from '@storybook/react';
import React from 'react';

import { Button } from './Button';

export default {
  title: 'ui-components/Button',
  component: Button,

  argTypes: {
    backgroundColor: { control: 'color' },
  },
};

const Template: Story<Parameters<typeof Button>[0]> = (args) => {
  return <Button {...args}></Button>;
};

export const BasicTest = Template.bind({});

BasicTest.args = {
  ariaLabel: 'Hi brother',
  onPress: () => {},
  children: 'Hello',
  className: 'i-am-a-class',
  animateOnPress: true,
};

export const DisabledButton = Template.bind({});

DisabledButton.args = {
  ariaLabel: 'Hi brother',
  onPress: () => {},
  children: 'Hello',
  className: 'i-am-a-class',
  isDisabled: true,
};

export const DestructiveButton = Template.bind({});

DestructiveButton.args = {
  ariaLabel: 'Hi brother',
  onPress: () => {},
  children: 'Hello',
  variant: 'destructive',
};

export const PrimaryButton = Template.bind({});

PrimaryButton.args = {
  ariaLabel: 'Hi brother',
  onPress: () => {},
  children: 'Hello',
  variant: 'primary',
};

export const QuietButton = Template.bind({});

QuietButton.args = {
  ariaLabel: 'Hi brother',
  onPress: () => {},
  children: 'Hello',
  isQuiet: true,
};
