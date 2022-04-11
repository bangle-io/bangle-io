import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import { ErrorBanner } from './ErrorBanner';

export default {
  title: 'ui-components/ErrorBanner',
  component: ErrorBanner,
  argTypes: {},
};

const Template: Story<Parameters<typeof ErrorBanner>[0]> = (args) => {
  return <ErrorBanner {...args}></ErrorBanner>;
};

export const Primary = Template.bind({});

Primary.args = {
  content: 'There was an error',
  dataTestId: '',
  title: 'Error',
};
