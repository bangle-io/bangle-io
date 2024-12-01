import type { WorkspaceStorageType } from '@bangle.io/types';
import { cn } from '@bangle.io/ui-utils';
import { usePrevious } from '@mantine/hooks';
import { Check, FolderOpen } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
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

export interface StorageTypeConfig {
  type: WorkspaceStorageType;
  disabled?: boolean;
  defaultSelected?: boolean;
  title: string;
  description: string;
}

export type DirectoryPickResult =
  | { type: 'success'; dirHandle: FileSystemDirectoryHandle }
  | { type: 'error'; error: Error; title?: string; message?: string };

export interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (opts: {
    wsName: string;
    type: WorkspaceStorageType;
    dirHandle?: FileSystemDirectoryHandle;
  }) => void;
  storageTypes: StorageTypeConfig[];
  onDirectoryPick?: () => Promise<DirectoryPickResult>;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onDone,
  storageTypes,
  onDirectoryPick,
}: CreateWorkspaceDialogProps) {
  const prevOpen = usePrevious(open);
  const defaultStorage =
    storageTypes.find((t) => t.defaultSelected)?.type ||
    storageTypes[0]?.type ||
    'browser';

  const [state, setState] = React.useState<
    | { stage: 'select-type'; selected: WorkspaceStorageType }
    | {
        stage: 'selected-nativefs';
        pick: DirectoryPickResult | undefined;
      }
    | { stage: 'selected-browser'; name: string }
  >({ stage: 'select-type', selected: defaultStorage });

  useEffect(() => {
    if (open && !prevOpen) {
      setState({ stage: 'select-type', selected: defaultStorage });
    }
  }, [open, prevOpen, defaultStorage]);

  const handleSelectStorage = (selected: WorkspaceStorageType) => {
    setState({
      stage: 'select-type',
      selected: selected,
    });
  };

  const handleNext = () => {
    if (state.stage === 'select-type') {
      if (state.selected === 'browser') {
        setState({ stage: 'selected-browser', name: '' });
      } else if (state.selected === 'nativefs') {
        setState({ stage: 'selected-nativefs', pick: undefined });
      }
    }
  };

  const handleChangeName = (name: string) => {
    setState({ stage: 'selected-browser', name });
  };

  const handleSubmit = async () => {
    if (state.stage === 'selected-browser') {
      onDone({ wsName: state.name, type: 'browser' });
    } else if (
      state.stage === 'selected-nativefs' &&
      state.pick?.type === 'success'
    ) {
      onDone({
        wsName: state.pick.dirHandle.name,
        dirHandle: state.pick.dirHandle,
        type: 'nativefs',
      });
    }
  };

  const handlePickDirectory = () => {
    if (onDirectoryPick) {
      onDirectoryPick().then((result) => {
        setState((existingState) => {
          if (existingState.stage === 'selected-nativefs') {
            return { ...existingState, pick: result };
          }
          return existingState;
        });
      });
    }
  };

  const handleClearDirectory = () => {
    setState((existingState) => {
      if (existingState.stage === 'selected-nativefs') {
        return { ...existingState, pick: undefined };
      }
      return existingState;
    });
  };

  const handleBack = () => {
    if (
      state.stage === 'selected-browser' ||
      state.stage === 'selected-nativefs'
    ) {
      setState({ stage: 'select-type', selected: 'browser' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {state.stage === 'select-type' && (
          <StageSelectStorage
            selectedStorage={state.selected}
            onSelectStorage={handleSelectStorage}
            onNext={handleNext}
            storageTypes={storageTypes}
          />
        )}
        {state.stage === 'selected-browser' && (
          <StageEnterWorkspaceName
            workspaceName={state.name}
            onChangeName={handleChangeName}
            onBack={handleBack}
            onSubmit={handleSubmit}
          />
        )}
        {state.stage === 'selected-nativefs' && (
          <StagePickDirectory
            dirHandle={
              state.pick?.type === 'success' ? state.pick.dirHandle : undefined
            }
            error={
              state.pick?.type === 'error'
                ? {
                    title: state.pick.title,
                    message: state.pick.message,
                    error: state.pick.error,
                  }
                : undefined
            }
            onPickDirectory={handlePickDirectory}
            onClearDirectory={handleClearDirectory}
            onBack={handleBack}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface StageSelectStorageProps {
  selectedStorage: WorkspaceStorageType;
  onSelectStorage: (selected: WorkspaceStorageType) => void;
  onNext: () => void;
  storageTypes: StorageTypeConfig[];
}

const StageSelectStorage: React.FC<StageSelectStorageProps> = ({
  selectedStorage,
  onSelectStorage,
  onNext,
  storageTypes,
}) => {
  return (
    <>
      <DialogHeader className="mb-2">
        <DialogTitle className="font-semibold text-lg">
          Select a workspace type
        </DialogTitle>
      </DialogHeader>
      <ul className="space-y-4">
        {storageTypes.map((config) => (
          <ListItem
            key={config.type}
            title={config.title}
            description={config.description}
            isSelected={selectedStorage === config.type}
            onClick={() => onSelectStorage(config.type)}
            disabled={config.disabled || false}
            className={config.disabled ? 'cursor-not-allowed opacity-50' : ''}
          />
        ))}
      </ul>
      <DialogFooter className="flex-col sm:justify-between">
        <div className="flex items-center pb-1 sm:pb-0">
          <a
            href="https://bangle.io/privacy"
            className="block text-blue-400 text-sm hover:underline"
          >
            Your data stays with you
          </a>
        </div>
        <Button onClick={onNext} disabled={!selectedStorage}>
          Next
        </Button>
      </DialogFooter>
    </>
  );
};

interface StageEnterWorkspaceNameProps {
  workspaceName: string;
  onChangeName: (name: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

const StageEnterWorkspaceName: React.FC<StageEnterWorkspaceNameProps> = ({
  workspaceName,
  onChangeName,
  onBack,
  onSubmit,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSubmit();
    }
  };

  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

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
            Name
          </Label>
          <Input
            id="workspaceName"
            ref={ref}
            value={workspaceName}
            onKeyDown={handleKeyDown}
            onChange={(e) => onChangeName(e.target.value)}
            className="col-span-3"
          />
        </div>
      </div>
      <DialogFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" onClick={onSubmit} disabled={!workspaceName}>
          Create Workspace
        </Button>
      </DialogFooter>
    </>
  );
};

interface StagePickDirectoryProps {
  dirHandle?: FileSystemDirectoryHandle;
  error?: {
    title?: string;
    message?: string;
    error: Error;
  };
  onPickDirectory: () => void;
  onClearDirectory: () => void;
  onBack: () => void;
  onSubmit: () => void;
}

const StagePickDirectory: React.FC<StagePickDirectoryProps> = ({
  dirHandle,
  error,
  onPickDirectory,
  onClearDirectory,
  onBack,
  onSubmit,
}) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Select Directory</DialogTitle>
        <DialogDescription>
          <span>Choose a directory to store your notes.</span>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {!dirHandle && (
          <Button onClick={onPickDirectory}>
            <FolderOpen />
            <span>Pick Directory</span>
          </Button>
        )}
        {dirHandle && (
          <div className="flex items-center space-x-2">
            <Button onClick={onPickDirectory}>
              <Check />
              <span>{dirHandle.name}</span>
            </Button>

            <Button variant="outline" onClick={onClearDirectory}>
              Clear
            </Button>
          </div>
        )}
        {error && (
          <div className="text-destructive text-sm">
            <strong>{error.title || 'Error'}:</strong>{' '}
            {error.message || error.error.message}
          </div>
        )}
      </div>

      <DialogFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onSubmit} disabled={!dirHandle}>
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
  className?: string;
}

const ListItem: React.FC<ListItemProps> = ({
  title,
  description,
  isSelected,
  onClick,
  disabled,
  className,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      onClick();
    }
  };

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative block w-full cursor-pointer select-none space-y-1 rounded-md p-3 text-left leading-none transition-colors duration-200 ease-in-out hover:bg-muted focus:bg-muted',
          isSelected && 'bg-muted',
          className,
        )}
        disabled={disabled}
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
