import './style';

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { TextField } from './TextField';

const meta: Meta<typeof TextField> = {
  title: 'ui-components/TextField',
  component: TextField,
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof TextField>;

export const Primary: Story = {
  args: {
    errorMessage: 'errored',
    label: 'I am label',
  },
};

export const Case2: Story = {
  args: {
    label: 'Email',
    placeholder: 'abc@example.com',
    description: 'Enter an email for us to contact you about your order.',
  },
};
