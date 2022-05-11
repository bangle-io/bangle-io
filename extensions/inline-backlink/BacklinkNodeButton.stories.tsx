import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import { BacklinkNodeButton } from './BacklinkNodeButton';

export default {
  title: 'inline-backlink/BacklinkNodeButton',
  component: BacklinkNodeButton,
  argTypes: {},
};

const Template: Story<Parameters<typeof BacklinkNodeButton>[0]> = (args) => {
  return <BacklinkNodeButton {...args}></BacklinkNodeButton>;
};

export const Primary = Template.bind({});

Primary.args = {
  linkNotFound: true,
  onClick: () => {},
  title: 'Hello',
  onHoverChange: (state) => {
    // console.log('hovering');
  },
};
