import { cx } from '@bangle.io/base-utils';
import { CommandGroup } from 'cmdk';
import React from 'react';
import {
  CommandBadge,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';

type DialogSingleInputProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  command: {
    id: string;
    title?: string;
  };
  onRun: (input: string) => void;
  placeholder?: string;
  groupHeading?: string;
  Icon?: React.ElementType;
  badgeTone?: 'destructive' | 'default';
  badgeText?: string;
};

/**
 * A simple dialog with a single option.
 */
export function DialogSingleInput({
  open,
  setOpen,
  command,
  onRun: onCommand,
  groupHeading = '',
  placeholder = 'Input..',
  badgeText,
  badgeTone = 'default',
  Icon,
}: DialogSingleInputProps) {
  const [search, setSearch] = React.useState('');
  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      {badgeText && (
        <CommandBadge
          className={cx(badgeTone === 'destructive' && 'bg-destructive')}
        >
          <span
            className={cx(
              badgeTone === 'destructive' && 'text-destructive-foreground',
            )}
          >
            {badgeText}
          </span>
        </CommandBadge>
      )}
      <CommandInput
        placeholder={placeholder}
        value={search}
        onValueChange={setSearch}
        Icon={Icon}
      />
      <CommandList>
        <CommandGroup heading={groupHeading}>
          <CommandItem
            key={command.id}
            onSelect={() => {
              if (search) {
                onCommand(search);
              }
              setOpen(false);
            }}
          >
            {command.title || command.id}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
