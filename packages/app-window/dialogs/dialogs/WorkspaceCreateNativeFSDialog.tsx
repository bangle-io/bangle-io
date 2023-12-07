import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  Divider,
  Flex,
  Footer,
  Form,
  Header,
  Heading,
  Link,
  Text,
  Tooltip,
  TooltipTrigger,
  useDialogContainer,
} from '@adobe/react-spectrum';
import { useStore } from '@nalanda/react';
import CrossMediumIcon from '@spectrum-icons/ui/CrossMedium';
import FolderOpenIcon from '@spectrum-icons/workflow/FolderOpen';
import React, { useCallback, useReducer } from 'react';

import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
  pickADirectory,
} from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import { vars } from '@bangle.io/css-vars';
import { AppDialog } from '@bangle.io/dialog-maker';
import { getWindowStoreConfig } from '@bangle.io/lib-window-common';
import { APP_DIALOG_NAME } from '@bangle.io/slice-ui';

type DialogProps = Extract<
  AppDialog,
  { name: (typeof APP_DIALOG_NAME)['workspaceCreateNativeFS'] }
>;

export const ERROR_TYPES = {
  ERROR_PICKING_DIRECTORY: 'ERROR_PICKING_DIRECTORY',
  UNKNOWN: 'UNKNOWN_ERROR',
  INVALID_WORKSPACE_NAME: 'INVALID_WORKSPACE_NAME',
  WORKSPACE_AUTH_REJECTED: 'WORKSPACE_AUTH_REJECTED',
  CLICKED_TOO_SOON: 'CLICKED_TOO_SOON_ERROR',
  WORKSPACE_NAME_ALREADY_EXISTS: 'WORKSPACE_NAME_ALREADY_EXISTS',
} as const;

export type WorkspaceCreateErrorTypes =
  (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];

export interface ModalState {
  error?: WorkspaceCreateErrorTypes;
  workspace?: { name: string; rootDir: FileSystemDirectoryHandle };
}

export type ModalStateAction =
  | { type: 'update_workspace'; workspace: ModalState['workspace'] }
  | { type: 'update_error'; error?: WorkspaceCreateErrorTypes }
  | { type: 'reset' };

export const modalReducer = (
  state: ModalState,
  action: ModalStateAction,
): ModalState => {
  switch (action.type) {
    case 'update_workspace':
      return { ...state, workspace: action.workspace, error: undefined };
    case 'update_error':
      return { ...state, error: action.error };
    case 'reset':
      return { error: undefined, workspace: undefined };
  }
};

export function WorkspaceCreateNativeFSDialog() {
  const dialog = useDialogContainer();
  const store = useStore();
  const { eternalVars } = getWindowStoreConfig(store);

  const [modalState, dispatch] = useReducer(modalReducer, {});

  const onConfirm = useCallback(() => {
    if (!modalState.workspace) return;
    void eternalVars.appDatabase.createWorkspaceInfo({
      metadata: {
        rootDirHandle: modalState.workspace.rootDir,
      },
      name: modalState.workspace.name,
      type: WorkspaceType.NativeFS,
    });
    dialog.dismiss();
  }, [dialog, eternalVars.appDatabase, modalState.workspace]);

  const updateRootDirHandle = useCallback(
    (rootDir?: FileSystemDirectoryHandle) => {
      if (rootDir) {
        dispatch({
          type: 'update_workspace',
          workspace: { name: rootDir.name, rootDir: rootDir },
        });
      } else {
        dispatch({ type: 'reset' });
      }
    },
    [dispatch],
  );

  const setError = useCallback((error?: WorkspaceCreateErrorTypes) => {
    dispatch({ type: 'update_error', error });
  }, []);

  const wsName = modalState.workspace?.name;

  return (
    <Dialog>
      <Heading>Create New Workspace</Heading>
      <Divider />
      <ButtonGroup flex="row-reverse">
        <Button variant="secondary" onPress={() => dialog.dismiss()}>
          Cancel
        </Button>
        <Button
          autoFocus
          variant="accent"
          isDisabled={!wsName}
          onPress={onConfirm}
        >
          Create Workspace
        </Button>
      </ButtonGroup>
      <Content>
        {modalState.error && (
          <ShowError
            closeModal={() => dialog.dismiss()}
            errorType={modalState.error}
          />
        )}
        <WorkspaceForm
          wsName={wsName}
          onConfirm={onConfirm}
          setError={setError}
          updateRootDirHandle={updateRootDirHandle}
        />
      </Content>
      <Footer>
        <Link target="_blank" href="https://bangle.io/privacy">
          Your data stays with you
        </Link>
      </Footer>
    </Dialog>
  );
}

export function WorkspaceForm({
  wsName,
  onConfirm,
  setError,
  updateRootDirHandle,
}: {
  wsName?: string;
  onConfirm: () => void;
  setError: (error: WorkspaceCreateErrorTypes) => void;
  updateRootDirHandle: (fileStorage?: FileSystemDirectoryHandle) => void;
}) {
  return (
    <Form
      isRequired
      validationBehavior="native"
      onSubmit={(e) => {
        e.preventDefault();
        if (wsName) onConfirm();
      }}
    >
      <Header UNSAFE_className="font-bold">Choose Location</Header>
      <Text>
        Please select a directory to store your Bangle.io notes. This can be an
        existing folder or a new one.
      </Text>
      <div>
        {wsName ? (
          <SelectedDirectory
            wsName={wsName}
            resetSelection={() => updateRootDirHandle()}
          />
        ) : (
          <PickStorageDirectory
            setError={setError}
            updateRootDirHandle={updateRootDirHandle}
          />
        )}
      </div>
    </Form>
  );
}

function SelectedDirectory({
  wsName,
  resetSelection,
}: {
  wsName: string;
  resetSelection: () => void;
}) {
  return (
    <Flex direction="row" gap="size-200" alignItems="center">
      <Text UNSAFE_className="font-italic">Directory:</Text>
      <div>
        <TooltipTrigger placement="bottom">
          <ActionButton isQuiet onPress={resetSelection}>
            <Text UNSAFE_className="font-bold">{wsName}</Text>
            <CrossMediumIcon />
          </ActionButton>
          <Tooltip>This is the directory you selected</Tooltip>
        </TooltipTrigger>
      </div>
    </Flex>
  );
}

function PickStorageDirectory({
  setError,
  updateRootDirHandle,
}: {
  setError: (error: WorkspaceCreateErrorTypes) => void;
  updateRootDirHandle: (fileStorage?: FileSystemDirectoryHandle) => void;
}) {
  const handlePickDirectory = useCallback(async () => {
    try {
      const rootDirHandle = await pickADirectory();
      updateRootDirHandle(rootDirHandle);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message
          .toLocaleLowerCase()
          .includes('user activation is required')
      ) {
        setError(ERROR_TYPES.CLICKED_TOO_SOON);
        return;
      }
      if (
        error instanceof BaseFileSystemError &&
        (error.code === NATIVE_BROWSER_PERMISSION_ERROR ||
          error.code === NATIVE_BROWSER_USER_ABORTED_ERROR)
      ) {
        setError(ERROR_TYPES.WORKSPACE_AUTH_REJECTED);
        return;
      }
      if (error instanceof BaseFileSystemError) {
        setError(ERROR_TYPES.ERROR_PICKING_DIRECTORY);
        return;
      }
      if (
        error instanceof Error &&
        error.message
          .toLocaleLowerCase()
          .includes('permission to edit directory was denied')
      ) {
        setError(ERROR_TYPES.WORKSPACE_AUTH_REJECTED);
        return;
      }
      setError(ERROR_TYPES.UNKNOWN);
      throw error;
    }
  }, [updateRootDirHandle, setError]);

  return (
    <ActionButton
      autoFocus
      onPress={() => {
        void handlePickDirectory();
      }}
    >
      <FolderOpenIcon />
      <Text>Select a Folder</Text>
    </ActionButton>
  );
}

export function ShowError({
  errorType,
  closeModal,
}: {
  errorType: WorkspaceCreateErrorTypes;
  closeModal: () => void;
}): React.ReactNode {
  if (!errorType) {
    return null;
  }
  const errorMessages = {
    [ERROR_TYPES.WORKSPACE_NAME_ALREADY_EXISTS]: {
      title: 'A workspace with the same name already exists.',
      content: (
        <div>
          <button className="underline" onClick={closeModal}>
            Click here
          </button>{' '}
          to open it
        </div>
      ),
    },
    [ERROR_TYPES.ERROR_PICKING_DIRECTORY]: {
      title: 'There was an error opening your notes folder.',
      content:
        'Please make sure your notes folder inside a common location like Documents or Desktop.',
    },
    [ERROR_TYPES.CLICKED_TOO_SOON]: {
      title: 'That didn’t work',
      content: 'Please try clicking the Browse button again.',
    },
    [ERROR_TYPES.INVALID_WORKSPACE_NAME]: {
      title: 'Invalid workspace name',
      content: 'Workspace cannot have ":" in its name.',
    },
    [ERROR_TYPES.WORKSPACE_AUTH_REJECTED]: {
      title: 'Bangle.io was denied access to your notes.',
      content: 'Please press "allow" to let Bangle.io access your notes.',
    },
    [ERROR_TYPES.UNKNOWN]: {
      title: 'Bangle.io was unable to access your notes.',
      content: (
        <div>
          Please reload window and try again. If the problem still persists open
          an issue at{' '}
          <a
            href="https://github.com/bangle-io/bangle-io/issues"
            className="underline"
          >
            Github
          </a>
          .
        </div>
      ),
    },
  };

  const { title, content } = errorMessages[errorType] || {};

  return (
    <div
      className="w-full m-1 px-5 py-3 text-center rounded"
      data-testid={errorType}
      style={{
        backgroundColor: vars.color.critical.solidFaint,
        color: vars.color.critical.solidText,
      }}
    >
      <div className="font-semibold text-left">{title}</div>
      <div className="text-left">{content}</div>
    </div>
  );
}
