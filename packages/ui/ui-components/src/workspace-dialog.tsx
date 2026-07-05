import {
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@bangle.io/base-ui';
import { Button } from '@bangle.io/shadcn';
import type { WorkspaceStorageType } from '@bangle.io/types';
import { Check, FolderOpen } from 'lucide-react';
import React, { useEffect, useId, useReducer, useRef } from 'react';

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
  | { type: 'error'; errorInfo: ErrorInfo; error: Error };

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
    DEFAULT_STORAGE;

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
            <DialogTitle>
              {t.app.dialogs.createWorkspace.errorTitle}
            </DialogTitle>
            <DialogDescription>
              {t.app.dialogs.createWorkspace.noStorageTypes}
            </DialogDescription>
          </DialogHeader>
          <div className="text-destructive">
            {t.app.dialogs.createWorkspace.noStorageTypes}
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              {t.app.common.closeButton}
            </Button>
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
            onCancel={() => onOpenChange(false)}
          />
        )}
        {state.stage === 'selected-browser' && (
          <StageEnterWorkspaceName
            state={state}
            dispatch={dispatch}
            validateWorkspace={validateWorkspace}
            onDone={onDone}
            onCancel={() => onOpenChange(false)}
          />
        )}
        {state.stage === 'selected-nativefs' && (
          <StagePickDirectory
            state={state}
            dispatch={dispatch}
            onDirectoryPick={onDirectoryPick}
            validateWorkspace={validateWorkspace}
            onDone={onDone}
            onCancel={() => onOpenChange(false)}
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
  onCancel: () => void;
}

function WorkspaceDialogFooter({
  leadingAction,
  children,
}: {
  leadingAction: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DialogFooter className="gap-2 sm:items-center sm:justify-between sm:space-x-0">
      {leadingAction}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {children}
      </div>
    </DialogFooter>
  );
}

const StageSelectStorage: React.FC<StageSelectStorageProps> = ({
  state,
  dispatch,
  storageTypes,
  defaultStorage,
  onCancel,
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
          {t.app.dialogs.createWorkspace.selectTypeTitle}
        </DialogTitle>
        <DialogDescription>
          {t.app.dialogs.createWorkspace.selectTypeDescription}
        </DialogDescription>
      </DialogHeader>
      <div
        className="space-y-4"
        role="radiogroup"
        aria-label={t.app.dialogs.createWorkspace.selectTypeTitle}
      >
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
      </div>
      <ErrorMessage error={error} />
      <WorkspaceDialogFooter
        leadingAction={
          <Button
            variant="ghost"
            className="justify-start px-0 text-primary text-sm hover:underline"
            asChild
          >
            <a
              href="https://bangle.io/privacy"
              target="_blank"
              rel="noreferrer"
            >
              {t.app.dialogs.createWorkspace.dataPrivacyLink}
            </a>
          </Button>
        }
      >
        <Button variant="outline" onClick={onCancel}>
          {t.app.common.cancelButton}
        </Button>
        <Button onClick={handleNext} disabled={!selected}>
          {t.app.common.nextButton}
        </Button>
      </WorkspaceDialogFooter>
    </>
  );
};

interface StageEnterWorkspaceNameProps {
  state: BrowserState;
  dispatch: React.Dispatch<Action>;
  validateWorkspace: CreateWorkspaceDialogProps['validateWorkspace'];
  onDone: CreateWorkspaceDialogProps['onDone'];
  onCancel: () => void;
}

const StageEnterWorkspaceName: React.FC<StageEnterWorkspaceNameProps> = ({
  state,
  dispatch,
  validateWorkspace,
  onDone,
  onCancel,
}) => {
  const { name, error } = state;

  const ref = useRef<HTMLInputElement>(null);
  const workspaceNameId = useId();

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
        error: {
          message:
            validation.message ||
            t.app.dialogs.createWorkspace.invalidNameDefault,
        },
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
        <DialogTitle>
          {t.app.dialogs.createWorkspace.enterNameTitle}
        </DialogTitle>
        <DialogDescription>
          {t.app.dialogs.createWorkspace.enterNameDescription}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor={workspaceNameId} className="text-right">
            {t.app.dialogs.createWorkspace.nameLabel}
          </Label>
          <Input
            id={workspaceNameId}
            ref={ref}
            value={name}
            onKeyDown={handleKeyDown}
            onChange={handleChangeName}
            className="col-span-3"
          />
        </div>
        <ErrorMessage error={error} />
      </div>
      <WorkspaceDialogFooter
        leadingAction={
          <Button variant="outline" onClick={handleBack}>
            {t.app.common.backButton}
          </Button>
        }
      >
        <Button variant="outline" onClick={onCancel}>
          {t.app.common.cancelButton}
        </Button>
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={Boolean(error) || !name}
        >
          {t.app.common.createButton}
        </Button>
      </WorkspaceDialogFooter>
    </>
  );
};

interface StagePickDirectoryProps {
  state: NativeFsState;
  dispatch: React.Dispatch<Action>;
  onDirectoryPick?: CreateWorkspaceDialogProps['onDirectoryPick'];
  validateWorkspace: CreateWorkspaceDialogProps['validateWorkspace'];
  onDone: CreateWorkspaceDialogProps['onDone'];
  onCancel: () => void;
}

const StagePickDirectory: React.FC<StagePickDirectoryProps> = ({
  state,
  dispatch,
  onDirectoryPick,
  validateWorkspace,
  onDone,
  onCancel,
}) => {
  const { dirHandle, error } = state;

  const handlePickDirectory = async () => {
    if (!onDirectoryPick) {
      dispatch({
        type: 'UPDATE_ERROR',
        error: {
          message: t.app.dialogs.createWorkspace.directoryPickingUnsupported,
        },
      });
      return;
    }
    const result = await onDirectoryPick();
    if (result.type === 'error') {
      dispatch({ type: 'UPDATE_ERROR', error: result.errorInfo });
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
        error: {
          message:
            validation.message ||
            t.app.dialogs.createWorkspace.invalidDirectoryDefault,
        },
      });
      return;
    }
    onDone({ type: 'nativefs', name: dirName, dirHandle });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {t.app.dialogs.createWorkspace.selectDirectoryTitle}
        </DialogTitle>
        <DialogDescription>
          <span>
            {t.app.dialogs.createWorkspace.selectDirectoryDescription}
          </span>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {!dirHandle ? (
          <Button onClick={handlePickDirectory} disabled={!onDirectoryPick}>
            <FolderOpen />
            <span>{t.app.dialogs.createWorkspace.pickDirectoryButton}</span>
          </Button>
        ) : (
          <div className="flex items-center space-x-2">
            <Button onClick={handlePickDirectory}>
              <Check />
              <span>{dirHandle.name}</span>
            </Button>

            <Button variant="outline" onClick={handleClearDirectory}>
              {t.app.common.clearButton}
            </Button>
          </div>
        )}
        <ErrorMessage error={error} />
      </div>

      <WorkspaceDialogFooter
        leadingAction={
          <Button variant="outline" onClick={handleBack}>
            {t.app.common.backButton}
          </Button>
        }
      >
        <Button variant="outline" onClick={onCancel}>
          {t.app.common.cancelButton}
        </Button>
        <Button onClick={handleSubmit} disabled={!dirHandle}>
          {t.app.common.createButton}
        </Button>
      </WorkspaceDialogFooter>
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
  return (
    <label
      className={cn(
        'relative block w-full cursor-pointer select-none space-y-1 rounded-md p-3 text-left leading-none transition-colors duration-200 ease-in-out focus-within:bg-muted focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:bg-muted',
        isSelected && 'bg-muted',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        type="radio"
        name="workspace-storage-type"
        checked={isSelected}
        onChange={() => {
          if (!disabled) {
            onClick();
          }
        }}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <div className="flex items-center justify-between space-x-1">
        <div>
          <span className="mb-1 block font-semibold text-sm leading-none tracking-tight">
            {title}
          </span>
          <span className="block text-foreground/80 text-sm">
            {description}
          </span>
        </div>
        <div className="h-4 w-4 shrink-0">
          <Check
            className={`h-4 w-4 transition-opacity duration-300 ${
              isSelected ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      </div>
    </label>
  );
};

const ErrorMessage: React.FC<{ error?: ErrorInfo }> = ({ error }) => {
  if (!error) return null;
  return (
    <div className="rounded-sm bg-destructive p-2 text-destructive-foreground text-sm">
      {error.title && <strong>{error.title}: </strong>}
      {error.message}
    </div>
  );
};
