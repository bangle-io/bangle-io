import '../style';

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'ui-components/Input',
  component: Input,
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof Input>;

export const Primary: Story = {
  args: {},
};
