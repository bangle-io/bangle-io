import '../style';

import type { Story } from '@storybook/react';
import React from 'react';

import { TextField } from './TextField';

export default {
  title: 'ui-components/TextField',
  component: TextField,
  argTypes: {},
};

const Template: Story<Parameters<typeof TextField>[0]> = (args) => {
  return <TextField {...args}></TextField>;
};

export const Primary = Template.bind({});

Primary.args = {
  errorMessage: 'errored',
  label: 'I am label',
};

export const Case2 = Template.bind({});

Case2.args = {
  label: 'Email',
  placeholder: 'abc@example.com',
  description: 'Enter an email for us to contact you about your order.',
};
