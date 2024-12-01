import type { WorkspaceStorageType } from '@bangle.io/types';
import { cn } from '@bangle.io/ui-utils';
import { Check, FolderOpen } from 'lucide-react';
import React, { useEffect, useReducer, useRef } from 'react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Input } from './input';
import { Label } from './label';

const DEFAULT_STORAGE = 'browser';

export interface StorageTypeConfig {
  type: WorkspaceStorageType;
  disabled?: boolean;
  defaultSelected?: boolean;
  title: string;
  description: string;
}

export interface ErrorInfo {
  title?: string;
  message: string;
}

export type DirectoryPickResult =
  | { type: 'success'; dirHandle: FileSystemDirectoryHandle }
  | { type: 'error'; error: ErrorInfo };

export interface WorkspaceValidation {
  isValid: boolean;
  message?: string;
}

export interface WorkspaceConfig {
  name: string;
  type: WorkspaceStorageType;
  dirHandle?: FileSystemDirectoryHandle;
}

export interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (config: WorkspaceConfig) => void;
  storageTypes: StorageTypeConfig[];
  onDirectoryPick?: () => Promise<DirectoryPickResult>;
  validateWorkspace: (config: WorkspaceConfig) => WorkspaceValidation;
}

type BaseState = {
  error?: ErrorInfo;
};

type SelectTypeState = BaseState & {
  stage: 'select-type';
  selected?: WorkspaceStorageType;
};

type BrowserState = BaseState & {
  stage: 'selected-browser';
  name: string;
};

type NativeFsState = BaseState & {
  stage: 'selected-nativefs';
  dirHandle?: FileSystemDirectoryHandle;
};

type State = SelectTypeState | BrowserState | NativeFsState;

type Action =
  | { type: 'RESET_TO_TYPE_SELECT'; defaultStorage: WorkspaceStorageType }
  | { type: 'NAVIGATE_TO_TYPE_SELECT' }
  | { type: 'NAVIGATE_TO_BROWSER' }
  | { type: 'NAVIGATE_TO_NATIVEFS' }
  | { type: 'UPDATE_SELECTED_STORAGE'; storage: WorkspaceStorageType }
  | { type: 'UPDATE_WORKSPACE_NAME'; name: string }
  | { type: 'UPDATE_DIRECTORY_HANDLE'; dirHandle?: FileSystemDirectoryHandle }
  | { type: 'UPDATE_ERROR'; error?: ErrorInfo };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'NAVIGATE_TO_TYPE_SELECT':
      return {
        stage: 'select-type',
        selected: undefined,
        error: undefined,
      };
    case 'NAVIGATE_TO_BROWSER':
      return { stage: 'selected-browser', name: '', error: undefined };
    case 'NAVIGATE_TO_NATIVEFS':
      return { stage: 'selected-nativefs', error: undefined };
    case 'UPDATE_SELECTED_STORAGE':
      if (state.stage === 'select-type') {
        return { ...state, selected: action.storage, error: undefined };
      }
      return state;
    case 'UPDATE_WORKSPACE_NAME':
      if (state.stage === 'selected-browser') {
        return { ...state, name: action.name, error: undefined };
      }
      return state;
    case 'UPDATE_DIRECTORY_HANDLE':
      if (state.stage === 'selected-nativefs') {
        return { ...state, dirHandle: action.dirHandle, error: undefined };
      }
      return state;
    case 'UPDATE_ERROR':
      return { ...state, error: action.error };
    case 'RESET_TO_TYPE_SELECT':
      return {
        stage: 'select-type',
        selected: action.defaultStorage,
        error: undefined,
      };
    default:
      return state;
  }
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onDone,
  storageTypes,
  onDirectoryPick,
  validateWorkspace,
}: CreateWorkspaceDialogProps) {
  const defaultStorage =
    storageTypes.find((t) => t.defaultSelected)?.type ||
    storageTypes[0]?.type ||
    'browser';

  const [state, dispatch] = useReducer(reducer, {
    stage: 'select-type',
    selected: defaultStorage,
  });

  useEffect(() => {
    if (open) {
      dispatch({ type: 'RESET_TO_TYPE_SELECT', defaultStorage });
    }
  }, [open, defaultStorage]);

  if (storageTypes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="text-destructive">
            No storage types are available.
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {state.stage === 'select-type' && (
          <StageSelectStorage
            state={state}
            dispatch={dispatch}
            storageTypes={storageTypes}
            defaultStorage={defaultStorage}
          />
        )}
        {state.stage === 'selected-browser' && (
          <StageEnterWorkspaceName
            state={state}
            dispatch={dispatch}
            validateWorkspace={validateWorkspace}
            onDone={onDone}
          />
        )}
        {state.stage === 'selected-nativefs' && (
          <StagePickDirectory
            state={state}
            dispatch={dispatch}
            onDirectoryPick={onDirectoryPick}
            validateWorkspace={validateWorkspace}
            onDone={onDone}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface StageSelectStorageProps {
  state: SelectTypeState;
  dispatch: React.Dispatch<Action>;
  storageTypes: StorageTypeConfig[];
  defaultStorage: WorkspaceStorageType;
}

const StageSelectStorage: React.FC<StageSelectStorageProps> = ({
  state,
  dispatch,
  storageTypes,
  defaultStorage,
}) => {
  const { selected = defaultStorage, error } = state;

  const handleSelectStorage = (storage: WorkspaceStorageType) => {
    dispatch({ type: 'UPDATE_SELECTED_STORAGE', storage });
  };

  const handleNext = () => {
    dispatch({
      type:
        selected === 'browser' ? 'NAVIGATE_TO_BROWSER' : 'NAVIGATE_TO_NATIVEFS',
    });
  };

  return (
    <>
      <DialogHeader className="mb-2">
        <DialogTitle className="font-semibold text-lg">
          Select a workspace type
        </DialogTitle>
      </DialogHeader>
      <ul className="space-y-4" role="radiogroup">
        {storageTypes.map((config) => (
          <ListItem
            key={config.type}
            title={config.title}
            description={config.description}
            isSelected={selected === config.type}
            onClick={() => handleSelectStorage(config.type)}
            disabled={config.disabled || false}
          />
        ))}
      </ul>
      <ErrorMessage error={error} />
      <DialogFooter className="flex-col sm:justify-between">
        <div className="flex items-center pb-1 sm:pb-0">
          <a
            href="https://bangle.io/privacy"
            className="block text-blue-400 text-sm hover:underline"
          >
            Your data stays with you
          </a>
        </div>
        <Button onClick={handleNext} disabled={!selected}>
          Next
        </Button>
      </DialogFooter>
    </>
  );
};

interface StageEnterWorkspaceNameProps {
  state: BrowserState;
  dispatch: React.Dispatch<Action>;
  validateWorkspace: CreateWorkspaceDialogProps['validateWorkspace'];
  onDone: CreateWorkspaceDialogProps['onDone'];
}

const StageEnterWorkspaceName: React.FC<StageEnterWorkspaceNameProps> = ({
  state,
  dispatch,
  validateWorkspace,
  onDone,
}) => {
  const { name, error } = state;

  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'UPDATE_WORKSPACE_NAME', name: e.target.value });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const config: WorkspaceConfig = {
      type: 'browser',
      name,
    };
    const validation = validateWorkspace(config);
    if (!validation.isValid) {
      dispatch({
        type: 'UPDATE_ERROR',
        error: { message: validation.message || 'Invalid workspace name' },
      });
      return;
    }
    onDone({ type: 'browser', name });
  };

  const handleBack = () => {
    dispatch({ type: 'NAVIGATE_TO_TYPE_SELECT' });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Enter Workspace Name</DialogTitle>
        <DialogDescription>
          Please enter a name for your workspace.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="workspaceName" className="text-right">
            Workspace Name
          </Label>
          <Input
            id="workspaceName"
            ref={ref}
            value={name}
            onKeyDown={handleKeyDown}
            onChange={handleChangeName}
            className="col-span-3"
          />
        </div>
        <ErrorMessage error={error} />
      </div>
      <DialogFooter className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={Boolean(error) || !name}
        >
          Create Workspace
        </Button>
      </DialogFooter>
    </>
  );
};

interface StagePickDirectoryProps {
  state: NativeFsState;
  dispatch: React.Dispatch<Action>;
  onDirectoryPick?: CreateWorkspaceDialogProps['onDirectoryPick'];
  validateWorkspace: CreateWorkspaceDialogProps['validateWorkspace'];
  onDone: CreateWorkspaceDialogProps['onDone'];
}

const StagePickDirectory: React.FC<StagePickDirectoryProps> = ({
  state,
  dispatch,
  onDirectoryPick,
  validateWorkspace,
  onDone,
}) => {
  const { dirHandle, error } = state;

  const handlePickDirectory = async () => {
    if (!onDirectoryPick) {
      dispatch({
        type: 'UPDATE_ERROR',
        error: { message: 'Directory picking is not supported.' },
      });
      return;
    }
    const result = await onDirectoryPick();
    if (result.type === 'error') {
      dispatch({ type: 'UPDATE_ERROR', error: result.error });
    } else {
      dispatch({
        type: 'UPDATE_DIRECTORY_HANDLE',
        dirHandle: result.dirHandle,
      });
    }
  };

  const handleClearDirectory = () => {
    dispatch({ type: 'UPDATE_DIRECTORY_HANDLE', dirHandle: undefined });
  };

  const handleBack = () => {
    dispatch({ type: 'NAVIGATE_TO_TYPE_SELECT' });
  };

  const handleSubmit = () => {
    const dirName = dirHandle?.name || '';
    const config: WorkspaceConfig = {
      type: 'nativefs',
      name: dirName,
      dirHandle,
    };
    const validation = validateWorkspace(config);
    if (!validation.isValid) {
      dispatch({
        type: 'UPDATE_ERROR',
        error: { message: validation.message || 'Invalid directory selection' },
      });
      return;
    }
    onDone({ type: 'nativefs', name: dirName, dirHandle });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Select Directory</DialogTitle>
        <DialogDescription>
          <span>Choose a directory to store your notes.</span>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {!dirHandle ? (
          <Button onClick={handlePickDirectory} disabled={!onDirectoryPick}>
            <FolderOpen />
            <span>Pick Directory</span>
          </Button>
        ) : (
          <div className="flex items-center space-x-2">
            <Button onClick={handlePickDirectory}>
              <Check />
              <span>{dirHandle.name}</span>
            </Button>

            <Button variant="outline" onClick={handleClearDirectory}>
              Clear
            </Button>
          </div>
        )}
        <ErrorMessage error={error} />
      </div>

      <DialogFooter className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={!dirHandle}>
          Create Workspace
        </Button>
      </DialogFooter>
    </>
  );
};

interface ListItemProps {
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}

const ListItem: React.FC<ListItemProps> = ({
  title,
  description,
  isSelected,
  onClick,
  disabled,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <li>
      <button
        type="button"
        onClick={disabled ? undefined : onClick}
        aria-checked={isSelected}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative block w-full cursor-pointer select-none space-y-1 rounded-md p-3 text-left leading-none transition-colors duration-200 ease-in-out hover:bg-muted focus:bg-muted',
          isSelected && 'bg-muted',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        disabled={disabled}
        // biome-ignore lint/a11y/useSemanticElements: <explanation>
        role="radio"
      >
        <div className="flex items-center justify-between space-x-1">
          <div>
            <h3 className="mb-1 font-semibold text-sm leading-none tracking-tight">
              {title}
            </h3>
            <p className="text-gray-400 text-sm">{description}</p>
          </div>
          <div className="h-4 w-4 flex-shrink-0">
            <Check
              className={`h-4 w-4 transition-opacity duration-300 ${
                isSelected ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
        </div>
      </button>
    </li>
  );
};

const ErrorMessage: React.FC<{ error?: ErrorInfo }> = ({ error }) => {
  if (!error) return null;
  return (
    <div className="text-destructive text-sm">
      {error.title && <strong>{error.title}: </strong>}
      {error.message}
    </div>
  );
};
