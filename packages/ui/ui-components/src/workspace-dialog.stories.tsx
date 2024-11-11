import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Button } from './button';
import { Dialog } from './dialog';
import { WorkspaceDialogRoot } from './workspace-dialog';

const meta: Meta<typeof Dialog> = {
  title: 'WorkspaceDialog',
  component: Dialog,
  tags: [],
};

export default meta;

export function WorkspaceDialogRootExample() {
  const [open, setOpen] = React.useState(false);
  const [currentWorkspace, setCurrentWorkspace] = React.useState('');

  const handleDone = ({ wsName }: { wsName: string }) => {
    setOpen(false);
    setCurrentWorkspace(wsName);
  };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open Workspace Dialog
      </Button>
      <p>Current Workspace: {currentWorkspace || 'N/A'}</p>
      <WorkspaceDialogRoot
        open={open}
        onOpenChange={setOpen}
        onDone={handleDone}
        disabledStorageTypes={['native-fs']}
      />
    </>
  );
}
