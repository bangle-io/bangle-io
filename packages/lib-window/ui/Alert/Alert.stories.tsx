import type { Meta, StoryObj } from '@storybook/react';
import { Terminal } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from './index';

const meta: Meta<typeof Alert> = {
  title: 'ui-components/Alert',
  component: Alert,
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof Alert>;

export const AlertDefault: Story = {
  render: () => {
    return (
      <>
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>
            You can add components and dependencies to your app using the cli.
          </AlertDescription>
        </Alert>
      </>
    );
  },
};
