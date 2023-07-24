import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { LocationBreadCrumb } from './LocationBreadCrumb';

const meta: Meta<typeof LocationBreadCrumb> = {
  title: 'ui-components/LocationBreadCrumb',
  component: LocationBreadCrumb,
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof LocationBreadCrumb>;

export const Primary: Story = {
  args: {
    filePath: 'hi/brothers',
  },
};
