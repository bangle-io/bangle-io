import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Button } from './button';
import { Dialog, DialogTrigger } from './dialog';
import { WorkspaceDialogName } from './workspace-dialog-name';

const meta: Meta<typeof Dialog> = {
  title: 'WorkspaceDialogName',
  component: Dialog,
  tags: [],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export function WorkspaceDialogNameExample() {
  const [name, setName] = React.useState('');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Workspace Dialog Name</Button>
      </DialogTrigger>
      <WorkspaceDialogName
        name={name}
        onChangeName={setName}
        onSubmit={() => console.log('Submitted Name:', name)}
        onBack={() => console.log('Back button clicked')}
      />
    </Dialog>
  );
}
