import type { Meta, StoryObj } from '@storybook/react';
import React, { useRef, useState } from 'react';
import {
  CreateWorkspaceDialog,
  type CreateWorkspaceDialogProps,
  type DirectoryPickResult,
  type StorageTypeConfig,
} from './workspace-dialog';

export default {
  title: 'WorkspaceDialog',
  component: CreateWorkspaceDialog,
  tags: [],
} as Meta<typeof CreateWorkspaceDialog>;

type Story = StoryObj<typeof CreateWorkspaceDialog>;

const getStorageTypes = ({
  browserDisabled = false,
  nativeFsDisabled = false,
  defaultSelected = 'browser',
}: {
  browserDisabled?: boolean;
  nativeFsDisabled?: boolean;
  defaultSelected?: 'browser' | 'nativefs';
}): StorageTypeConfig[] => [
  {
    type: 'browser',
    title: 'Browser Storage',
    description:
      "Store notes in your browser's storage. Suitable for trying out Bangle, but notes may be lost if browser storage is cleared.",
    defaultSelected: defaultSelected === 'browser',
    disabled: browserDisabled,
  },
  {
    type: 'nativefs',
    title: 'Local File Storage',
    description:
      'Save notes directly to a folder of your choice for complete data ownership.',
    defaultSelected: defaultSelected === 'nativefs',
    disabled: nativeFsDisabled,
  },
];

const validateWorkspace: CreateWorkspaceDialogProps['validateWorkspace'] = ({
  name,
}) => {
  const isValid = /^[a-zA-Z0-9_]+$/.test(name);
  if (isValid) {
    return { isValid: true };
  }
  return {
    isValid: false,
    message: 'Workspace name contains invalid characters.',
  };
};

const Template: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    onDone: () => {},
    storageTypes: getStorageTypes({}),
    validateWorkspace,
  },
};

export const Default: Story = {
  ...Template,
};

export const NativeFs: Story = {
  ...Template,
  args: {
    ...Template.args,
    onDirectoryPick: async (): Promise<DirectoryPickResult> => ({
      type: 'success',
      dirHandle: { name: 'MyDirectory' } as FileSystemDirectoryHandle,
    }),
    storageTypes: getStorageTypes({
      browserDisabled: true,
      defaultSelected: 'nativefs',
    }),
  },
};

export const NativeFsError: Story = {
  ...Template,
  args: {
    ...Template.args,
    onDirectoryPick: async (): Promise<DirectoryPickResult> => ({
      type: 'error',
      error: new Error('Failed to access directory.'),
      errorInfo: {
        title: 'NotFoundError',
        message: 'Failed to access directory',
      },
    }),
    storageTypes: getStorageTypes({
      browserDisabled: true,
      defaultSelected: 'nativefs',
    }),
  },
};

export const InvalidWsName: Story = {
  ...Template,
  args: {
    ...Template.args,
    validateWorkspace,
  },
};

export const CreateFailure: Story = {
  ...Template,
  args: {
    ...Template.args,
  },
  render: (args: CreateWorkspaceDialogProps) => (
    <CreateFailureHarness {...args} />
  ),
};

function CreateFailureHarness(args: CreateWorkspaceDialogProps) {
  const attemptCountRef = useRef(0);
  const [attemptCount, setAttemptCount] = useState(0);

  return (
    <>
      <CreateWorkspaceDialog
        {...args}
        onDone={async () => {
          attemptCountRef.current += 1;
          setAttemptCount(attemptCountRef.current);
          await new Promise((resolve) => setTimeout(resolve, 100));
          throw new Error('Workspace storage is unavailable.');
        }}
      />
      <output aria-label="Creation attempts">{attemptCount}</output>
    </>
  );
}
