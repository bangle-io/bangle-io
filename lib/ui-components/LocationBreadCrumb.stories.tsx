import type { Story } from '@storybook/react';
import React from 'react';

import type { FirstParameter } from '@bangle.io/shared-types';

import { LocationBreadCrumb } from './LocationBreadCrumb';

export default {
  title: 'ui-components/LocationBreadCrumb',
  component: LocationBreadCrumb,

  argTypes: {
    backgroundColor: { control: 'color' },
  },
};

export const Primary: Story<FirstParameter<typeof LocationBreadCrumb>> = (
  args,
) => {
  return <LocationBreadCrumb {...args} />;
};

Primary.args = {
  filePath: 'hi/brothers',
};
