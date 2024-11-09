import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Button } from './button';
import { Dialog, DialogTrigger } from './dialog';
import { type StorageType, WorkspaceDialog } from './workspace-dialog';

const meta: Meta<typeof Dialog> = {
  title: 'WorkspaceDialog',
  component: Dialog,
  tags: [],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => {
    const [selectedStorage, setSelectedStorage] =
      React.useState<StorageType>('browser');
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open Workspace Dialog</Button>
        </DialogTrigger>
        <WorkspaceDialog
          className="sm:max-w-xl"
          selectedStorage={selectedStorage}
          onSelectStorage={setSelectedStorage}
        />
      </Dialog>
    );
  },
};
