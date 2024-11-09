import { cn } from '@bangle.io/ui-utils';
import { Check } from 'lucide-react';
import React, { useRef, useEffect } from 'react';
import { Button } from './button';

import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

export type StorageType = 'local' | 'browser';

interface WorkspaceDialogProps
  extends React.ComponentProps<typeof DialogContent> {
  selectedStorage: StorageType;
  onSelectStorage: (storage: StorageType) => void;
}

export function WorkspaceDialog({
  selectedStorage,
  onSelectStorage,
  ...props
}: WorkspaceDialogProps) {
  return (
    <DialogContent
      {...props}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
      }}
    >
      <DialogHeader className="mb-2">
        <DialogTitle className="font-semibold text-lg">
          Select a workspace type
        </DialogTitle>
      </DialogHeader>
      <ul className="space-y-4 ">
        <ListItem
          title="Local File Storage (Not supported by your browser)"
          description="This option allows you to save notes directly to a folder of your choice. We recommend it as it provides complete data ownership to our users."
          isSelected={selectedStorage === 'local'}
          onClick={() => onSelectStorage('local')}
        />
        <ListItem
          title="Browser Storage"
          description="Stores notes in your browser's storage. A good option if you want to try out Bangle. However, you can lose your notes if you clear your browser storage."
          isSelected={selectedStorage === 'browser'}
          onClick={() => onSelectStorage('browser')}
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
        <Button>Next</Button>
      </DialogFooter>
    </DialogContent>
  );
}

interface ListItemProps {
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

const ListItem: React.FC<ListItemProps> = ({
  title,
  description,
  isSelected,
  onClick,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      onClick();
    }
  };

  return (
    <li>
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative block w-full cursor-pointer select-none space-y-1 rounded-md p-3 text-left leading-none transition-colors duration-200 ease-in-out hover:bg-muted focus:bg-muted',
          isSelected && 'bg-muted',
        )}
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
