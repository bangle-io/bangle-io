import { cx } from '@bangle.io/base-utils';
import { CommandGroup } from 'cmdk';
import React from 'react';
import {
  CommandBadge,
  CommandDialog,
  CommandHints,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';

export type DialogSingleInputProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  option: {
    id: string;
    title?: string;
  };
  onSelect: (input: string) => void;
  placeholder?: string;
  groupHeading?: string;
  Icon?: React.ElementType;
  badgeTone?: 'destructive' | 'default';
  badgeText?: string;
  initialSearch?: string;
  hints?: string[];
};

/**
 * A simple dialog with a single option.
 */
export function DialogSingleInput({
  open,
  setOpen,
  option,
  onSelect,
  groupHeading = '',
  placeholder = t.app.dialogs.singleInput.placeholderDefault,
  badgeText,
  badgeTone = 'default',
  Icon,
  initialSearch = '',
  hints,
}: DialogSingleInputProps) {
  const [search, setSearch] = React.useState(initialSearch);
  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      shouldFilter={false}
      screenReaderTitle="dialog input"
    >
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
            key={option.id}
            onSelect={() => {
              if (search) {
                onSelect(search);
              }
              setOpen(false);
            }}
          >
            {option.title || option.id}
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <CommandHints hints={hints} />
    </CommandDialog>
  );
}
