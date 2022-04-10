import '../style';

import type { Story } from '@storybook/react';
import React from 'react';

import { Input } from './Input';

export default {
  title: 'ui-components/Input',
  component: Input,
  argTypes: {},
};

const Template: Story<Parameters<typeof Input>[0]> = (args) => {
  return <Input {...args}></Input>;
};

export const Primary = Template.bind({});

Primary.args = {};
