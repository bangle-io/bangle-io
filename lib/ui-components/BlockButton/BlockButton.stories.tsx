import './BlockButton.css';

import type { Story } from '@storybook/react';
import React from 'react';

import { SettingsIcon } from '..';
import { BlockButton } from './BlockButton';

export default {
  title: 'ui-components/BlockButton',
  component: BlockButton,
  argTypes: {},
};

const Template: Story<Parameters<typeof BlockButton>[0]> = (args) => {
  return <BlockButton {...args}></BlockButton>;
};

const styling = {
  color: 'var(--BV-ui-bangle-button-color)',
  hoverColor: 'var(--BV-ui-bangle-button-primary-hover-color)',
  hoverBgColor: 'var(--BV-ui-bangle-button-primary-hover-bg-color)',
};

export const Inactive = Template.bind({});

Inactive.args = {
  text: 'Block Button',
  hint: 'Block Button',
  isActive: false,
  borderAccentPosition: 'top',
  styling: styling,
  icon: <SettingsIcon className="h-7 w-7" />,
};

export const Active = Template.bind({});

Active.args = {
  text: 'Block Button',
  hint: 'Block Button',
  isActive: true,
  borderAccentPosition: 'bottom',
  styling: styling,
  icon: <SettingsIcon className="h-7 w-7" />,
};
