import './style';

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { BacklinkNodeButton } from './BacklinkNodeButton';

const meta: Meta<typeof BacklinkNodeButton> = {
  title: 'inline-backlink/BacklinkNodeButton',
  component: BacklinkNodeButton,
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof BacklinkNodeButton>;

export const Primary: Story = {
  args: {
    linkNotFound: true,
    onClick: () => {},
    title: 'Hello',
    onHoverChange: (state) => {
      // console.log('hovering');
    },
  },
};
