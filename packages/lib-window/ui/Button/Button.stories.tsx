import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from './index';

const meta: Meta<typeof Button> = {
  title: 'ui-components/Button',
  component: Button,
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof Button>;

export const ButtonDefault: Story = {
  render: () => {
    return (
      <div className="flex flex-row gap-4 ">
        <Button variant={'default'} size={'lg'}>
          Click
        </Button>
        <Button variant={'destructive'} size={'sm'}>
          Click
        </Button>
        <Button variant={'outline'} size={'sm'}>
          Click
        </Button>
        <Button variant={'secondary'} size={'sm'}>
          Click
        </Button>
        <Button variant={'ghost'} size={'sm'}>
          Click
        </Button>
        <Button variant={'link'} size={'sm'}>
          Click
        </Button>
      </div>
    );
  },
};
