import type { StorageType } from '@bangle.io/types';
import { cn } from '@bangle.io/ui-utils';
import { usePrevious } from '@mantine/hooks';
import { Check } from 'lucide-react';
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
interface WorkspaceDialogRootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: ({ wsName }: { wsName: string }) => void;
  disabledStorageTypes?: StorageType[]; // New prop
}

export function WorkspaceDialogRoot({
  open,
  onOpenChange,
  onDone,
  disabledStorageTypes = [],
}: WorkspaceDialogRootProps) {
  const prevOpen = usePrevious(open);
  const [state, setState] = React.useState<
    | { stage: 'select-type'; selected: StorageType }
    | { stage: 'selected-native-fs' }
    | { stage: 'selected-browser'; name: string }
  >({ stage: 'select-type', selected: 'browser' });

  useEffect(() => {
    if (open && !prevOpen) {
      setState({ stage: 'select-type', selected: 'browser' });
    }
  }, [open, prevOpen]);

  const handleSelectStorage = (selected: StorageType) => {
    setState({
      stage: 'select-type',
      selected: selected,
    });
  };

  const handleNext = () => {
    if (state.stage === 'select-type' && state.selected === 'browser') {
      setState({ stage: 'selected-browser', name: '' });
    } else {
      throw new Error('Not implemented');
    }
  };
  const handleChangeName = (name: string) => {
    setState({ stage: 'selected-browser', name });
  };

  const handleSubmit = () => {
    if (state.stage === 'selected-browser') {
      onDone({ wsName: state.name });
    } else if (state.stage === 'selected-native-fs') {
      onDone({ wsName: 'native-fs' });
    }
  };

  const handleBack = () => {
    if (
      state.stage === 'selected-browser' ||
      state.stage === 'selected-native-fs'
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
            disabledStorageTypes={disabledStorageTypes}
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
      </DialogContent>
    </Dialog>
  );
}

interface StageSelectStorageProps {
  selectedStorage: StorageType;
  onSelectStorage: (selected: StorageType) => void;
  onNext: () => void;
  disabledStorageTypes: StorageType[];
}

const StageSelectStorage: React.FC<StageSelectStorageProps> = ({
  selectedStorage,
  onSelectStorage,
  onNext,
  disabledStorageTypes,
}) => {
  return (
    <>
      <DialogHeader className="mb-2">
        <DialogTitle className="font-semibold text-lg">
          Select a workspace type
        </DialogTitle>
      </DialogHeader>
      <ul className="space-y-4">
        <ListItem
          title="Browser Storage"
          description="Store notes in your browser's storage. Suitable for trying out Bangle, but notes may be lost if browser storage is cleared."
          isSelected={selectedStorage === 'browser'}
          onClick={() => onSelectStorage('browser')}
          disabled={disabledStorageTypes.includes('browser')}
          className={
            disabledStorageTypes.includes('browser')
              ? 'cursor-not-allowed opacity-50'
              : ''
          }
        />
        <ListItem
          title="Local File Storage"
          description="Save notes directly to a folder of your choice for complete data ownership."
          isSelected={selectedStorage === 'native-fs'}
          onClick={() => onSelectStorage('native-fs')}
          disabled={disabledStorageTypes.includes('native-fs')}
          className={
            disabledStorageTypes.includes('native-fs')
              ? 'cursor-not-allowed opacity-50'
              : ''
          }
        />
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
