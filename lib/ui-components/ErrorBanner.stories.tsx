import './style';

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { ErrorBanner } from './ErrorBanner';

const meta: Meta<typeof ErrorBanner> = {
  title: 'ui-components/ErrorBanner',
  component: ErrorBanner,
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof ErrorBanner>;

export const Primary: Story = {
  args: {
    content: 'There was an error',
    dataTestId: '',
    title: 'Error',
  },
};
