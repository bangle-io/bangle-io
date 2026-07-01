import {
  DEFAULT_WORKSPACE_ATTACHMENT_CONFIG,
  WORKSPACE_ATTACHMENT_MODE,
} from '@bangle.io/constants';
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@bangle.io/shadcn';
import type {
  WorkspaceAttachmentConfig,
  WorkspaceStorageType,
} from '@bangle.io/types';
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
  serverPath?: string;
  attachments: WorkspaceAttachmentConfig;
}

export interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (config: WorkspaceConfig) => Promise<void> | void;
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

type NamedStorageState = BaseState & {
  stage: 'selected-name';
  storageType: WorkspaceStorageType;
  name: string;
  serverPath: string;
  attachments: WorkspaceAttachmentConfig;
};

type NativeFsState = BaseState & {
  stage: 'selected-nativefs';
  dirHandle?: FileSystemDirectoryHandle;
  attachments: WorkspaceAttachmentConfig;
};

type State = SelectTypeState | NamedStorageState | NativeFsState;

type Action =
  | { type: 'RESET_TO_TYPE_SELECT'; defaultStorage: WorkspaceStorageType }
  | { type: 'NAVIGATE_TO_TYPE_SELECT' }
  | { type: 'NAVIGATE_TO_NAMED_STORAGE'; storageType: WorkspaceStorageType }
  | { type: 'NAVIGATE_TO_NATIVEFS' }
  | { type: 'UPDATE_SELECTED_STORAGE'; storage: WorkspaceStorageType }
  | { type: 'UPDATE_WORKSPACE_NAME'; name: string }
  | { type: 'UPDATE_SERVER_PATH'; serverPath: string }
  | { type: 'UPDATE_DIRECTORY_HANDLE'; dirHandle?: FileSystemDirectoryHandle }
  | { type: 'UPDATE_ATTACHMENT_MODE'; mode: WorkspaceAttachmentConfig['mode'] }
  | { type: 'UPDATE_ATTACHMENT_DIRECTORY'; directory: string }
  | { type: 'UPDATE_ATTACHMENT_FILE_NAME_PREFIX'; fileNamePrefix: string }
  | { type: 'UPDATE_ERROR'; error?: ErrorInfo };

function getDefaultAttachmentConfig(): WorkspaceAttachmentConfig {
  return {
    mode: DEFAULT_WORKSPACE_ATTACHMENT_CONFIG.mode,
    directory: DEFAULT_WORKSPACE_ATTACHMENT_CONFIG.directory,
    fileNamePrefix: DEFAULT_WORKSPACE_ATTACHMENT_CONFIG.fileNamePrefix,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'NAVIGATE_TO_TYPE_SELECT':
      return {
        stage: 'select-type',
        selected: undefined,
        error: undefined,
      };
    case 'NAVIGATE_TO_NAMED_STORAGE':
      return {
        stage: 'selected-name',
        storageType: action.storageType,
        name: '',
        serverPath: '',
        attachments: getDefaultAttachmentConfig(),
        error: undefined,
      };
    case 'NAVIGATE_TO_NATIVEFS':
      return {
        stage: 'selected-nativefs',
        attachments: getDefaultAttachmentConfig(),
        error: undefined,
      };
    case 'UPDATE_SELECTED_STORAGE':
      if (state.stage === 'select-type') {
        return { ...state, selected: action.storage, error: undefined };
      }
      return state;
    case 'UPDATE_WORKSPACE_NAME':
      if (state.stage === 'selected-name') {
        return { ...state, name: action.name, error: undefined };
      }
      return state;
    case 'UPDATE_SERVER_PATH':
      if (state.stage === 'selected-name') {
        return { ...state, serverPath: action.serverPath, error: undefined };
      }
      return state;
    case 'UPDATE_DIRECTORY_HANDLE':
      if (state.stage === 'selected-nativefs') {
        return { ...state, dirHandle: action.dirHandle, error: undefined };
      }
      return state;
    case 'UPDATE_ATTACHMENT_MODE':
      if (
        state.stage === 'selected-name' ||
        state.stage === 'selected-nativefs'
      ) {
        return {
          ...state,
          attachments: { ...state.attachments, mode: action.mode },
          error: undefined,
        };
      }
      return state;
    case 'UPDATE_ATTACHMENT_DIRECTORY':
      if (
        state.stage === 'selected-name' ||
        state.stage === 'selected-nativefs'
      ) {
        return {
          ...state,
          attachments: { ...state.attachments, directory: action.directory },
          error: undefined,
        };
      }
      return state;
    case 'UPDATE_ATTACHMENT_FILE_NAME_PREFIX':
      if (
        state.stage === 'selected-name' ||
        state.stage === 'selected-nativefs'
      ) {
        return {
          ...state,
          attachments: {
            ...state.attachments,
            fileNamePrefix: action.fileNamePrefix,
          },
          error: undefined,
        };
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
          />
        )}
        {state.stage === 'selected-name' && (
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
  const titleId = useId();

  const handleSelectStorage = (storage: WorkspaceStorageType) => {
    dispatch({ type: 'UPDATE_SELECTED_STORAGE', storage });
  };

  const handleNext = () => {
    if (!selected) {
      return;
    }
    if (selected === 'nativefs') {
      dispatch({ type: 'NAVIGATE_TO_NATIVEFS' });
      return;
    }

    dispatch({
      type: 'NAVIGATE_TO_NAMED_STORAGE',
      storageType: selected,
    });
  };

  return (
    <>
      <DialogHeader className="mb-2">
        <DialogTitle id={titleId} className="font-semibold text-lg">
          {t.app.dialogs.createWorkspace.selectTypeTitle}
        </DialogTitle>
      </DialogHeader>
      {/* biome-ignore lint: Using ul as a container for radiogroup is a standard ARIA practice. */}
      <ul className="space-y-4" role="radiogroup" aria-labelledby={titleId}>
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
        <Button
          variant="ghost"
          className="ml-3 text-primary text-sm hover:underline"
          asChild
        >
          <a href="https://bangle.io/privacy" target="_blank" rel="noreferrer">
            {t.app.dialogs.createWorkspace.dataPrivacyLink}
          </a>
        </Button>
        <Button onClick={handleNext} disabled={!selected}>
          {t.app.common.nextButton}
        </Button>
      </DialogFooter>
    </>
  );
};

interface StageEnterWorkspaceNameProps {
  state: NamedStorageState;
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
  const { name, error, attachments } = state;

  const ref = useRef<HTMLInputElement>(null);
  const workspaceNameId = useId();
  const serverPathId = useId();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'UPDATE_WORKSPACE_NAME', name: e.target.value });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      void handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }
    const attachmentValidation = validateAttachmentConfig(attachments);
    if (!attachmentValidation.isValid) {
      dispatch({
        type: 'UPDATE_ERROR',
        error: { message: attachmentValidation.message },
      });
      return;
    }

    const normalizedServerPath = state.serverPath.trim();
    if (state.storageType === 'serverfs' && !normalizedServerPath) {
      dispatch({
        type: 'UPDATE_ERROR',
        error: {
          message: t.app.dialogs.createWorkspace.serverFsPathRequired,
        },
      });
      return;
    }

    const config: WorkspaceConfig = {
      type: state.storageType,
      name,
      serverPath: normalizedServerPath || undefined,
      attachments: normalizeAttachmentConfig(attachments),
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
    setIsSubmitting(true);
    try {
      await onDone({
        type: state.storageType,
        name,
        serverPath: normalizedServerPath || undefined,
        attachments: normalizeAttachmentConfig(attachments),
      });
    } catch (error) {
      dispatch({
        type: 'UPDATE_ERROR',
        error: { message: getErrorMessage(error) },
      });
    } finally {
      setIsSubmitting(false);
    }
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
        {state.storageType === 'serverfs' && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={serverPathId} className="text-right">
              {t.app.dialogs.createWorkspace.serverFsPathLabel}
            </Label>
            <Input
              id={serverPathId}
              value={state.serverPath}
              onChange={(event) =>
                dispatch({
                  type: 'UPDATE_SERVER_PATH',
                  serverPath: event.target.value,
                })
              }
              placeholder={
                t.app.dialogs.createWorkspace.serverFsPathPlaceholder
              }
              className="col-span-3"
            />
          </div>
        )}
        <AttachmentSettingsFields
          attachments={attachments}
          dispatch={dispatch}
        />
        <ErrorMessage error={error} />
      </div>
      <DialogFooter className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          {t.app.common.backButton}
        </Button>
        <Button
          type="submit"
          onClick={() => void handleSubmit()}
          disabled={Boolean(error) || !name || isSubmitting}
        >
          {t.app.common.createButton}
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
  const { dirHandle, error, attachments } = state;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }
    const attachmentValidation = validateAttachmentConfig(attachments);
    if (!attachmentValidation.isValid) {
      dispatch({
        type: 'UPDATE_ERROR',
        error: { message: attachmentValidation.message },
      });
      return;
    }

    const dirName = dirHandle?.name || '';
    const config: WorkspaceConfig = {
      type: 'nativefs',
      name: dirName,
      dirHandle,
      attachments: normalizeAttachmentConfig(attachments),
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
    setIsSubmitting(true);
    try {
      await onDone({
        type: 'nativefs',
        name: dirName,
        dirHandle,
        attachments: normalizeAttachmentConfig(attachments),
      });
    } catch (error) {
      dispatch({
        type: 'UPDATE_ERROR',
        error: { message: getErrorMessage(error) },
      });
    } finally {
      setIsSubmitting(false);
    }
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
        <AttachmentSettingsFields
          attachments={attachments}
          dispatch={dispatch}
        />
        <ErrorMessage error={error} />
      </div>

      <DialogFooter className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          {t.app.common.backButton}
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          disabled={!dirHandle || isSubmitting}
        >
          {t.app.common.createButton}
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
        // biome-ignore lint/a11y/useSemanticElements: custom styled button preserves radio semantics with roving selection behavior.
        role="radio"
      >
        <div className="flex items-center justify-between space-x-1">
          <div>
            <h3 className="mb-1 font-semibold text-sm leading-none tracking-tight">
              {title}
            </h3>
            <p className="text-foreground/80 text-sm">{description}</p>
          </div>
          <div className="h-4 w-4 shrink-0">
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
    <div className="rounded-sm bg-destructive p-2 text-destructive-foreground text-sm">
      {error.title && <strong>{error.title}: </strong>}
      {error.message}
    </div>
  );
};

function normalizeAttachmentConfig(
  attachments: WorkspaceAttachmentConfig,
): WorkspaceAttachmentConfig {
  return {
    mode:
      attachments.mode === WORKSPACE_ATTACHMENT_MODE.root
        ? WORKSPACE_ATTACHMENT_MODE.root
        : WORKSPACE_ATTACHMENT_MODE.relative,
    directory:
      attachments.directory.trim() ||
      DEFAULT_WORKSPACE_ATTACHMENT_CONFIG.directory,
    fileNamePrefix:
      attachments.fileNamePrefix.trim() ||
      DEFAULT_WORKSPACE_ATTACHMENT_CONFIG.fileNamePrefix,
  };
}

function validateAttachmentConfig(attachments: WorkspaceAttachmentConfig): {
  isValid: boolean;
  message: string;
} {
  if (!attachments.directory.trim()) {
    return {
      isValid: false,
      message: t.app.dialogs.createWorkspace.attachmentDirectoryRequired,
    };
  }

  if (!attachments.fileNamePrefix.trim()) {
    return {
      isValid: false,
      message: t.app.dialogs.createWorkspace.attachmentFilePrefixRequired,
    };
  }

  return { isValid: true, message: '' };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return t.app.dialogs.createWorkspace.invalidNameDefault;
}

const AttachmentSettingsFields: React.FC<{
  attachments: WorkspaceAttachmentConfig;
  dispatch: React.Dispatch<Action>;
}> = ({ attachments, dispatch }) => {
  const modeId = useId();
  const attachmentDirId = useId();
  const attachmentPrefixId = useId();

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <Label className="font-semibold text-sm">
        {t.app.dialogs.createWorkspace.attachmentSettingsTitle}
      </Label>

      <div className="grid gap-2">
        <Label htmlFor={modeId} className="text-xs">
          {t.app.dialogs.createWorkspace.attachmentModeLabel}
        </Label>
        <div id={modeId} className="flex gap-2">
          <Button
            type="button"
            variant={
              attachments.mode === WORKSPACE_ATTACHMENT_MODE.relative
                ? 'default'
                : 'outline'
            }
            size="sm"
            onClick={() =>
              dispatch({
                type: 'UPDATE_ATTACHMENT_MODE',
                mode: WORKSPACE_ATTACHMENT_MODE.relative,
              })
            }
          >
            {t.app.dialogs.createWorkspace.attachmentModeRelative}
          </Button>
          <Button
            type="button"
            variant={
              attachments.mode === WORKSPACE_ATTACHMENT_MODE.root
                ? 'default'
                : 'outline'
            }
            size="sm"
            onClick={() =>
              dispatch({
                type: 'UPDATE_ATTACHMENT_MODE',
                mode: WORKSPACE_ATTACHMENT_MODE.root,
              })
            }
          >
            {t.app.dialogs.createWorkspace.attachmentModeRoot}
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={attachmentDirId} className="text-xs">
          {t.app.dialogs.createWorkspace.attachmentDirectoryLabel}
        </Label>
        <Input
          id={attachmentDirId}
          value={attachments.directory}
          onChange={(event) =>
            dispatch({
              type: 'UPDATE_ATTACHMENT_DIRECTORY',
              directory: event.target.value,
            })
          }
          placeholder={DEFAULT_WORKSPACE_ATTACHMENT_CONFIG.directory}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={attachmentPrefixId} className="text-xs">
          {t.app.dialogs.createWorkspace.attachmentFilePrefixLabel}
        </Label>
        <Input
          id={attachmentPrefixId}
          value={attachments.fileNamePrefix}
          onChange={(event) =>
            dispatch({
              type: 'UPDATE_ATTACHMENT_FILE_NAME_PREFIX',
              fileNamePrefix: event.target.value,
            })
          }
          placeholder={DEFAULT_WORKSPACE_ATTACHMENT_CONFIG.fileNamePrefix}
        />
      </div>
    </div>
  );
};
