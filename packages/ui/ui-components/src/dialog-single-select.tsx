import { cx } from '@bangle.io/base-utils';
import React from 'react';
import {
  CommandBadge,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';

type DialogSingleSelectProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  options: { id: string; title?: string }[];
  onSelect: (option: { id: string; title?: string }) => void;
  placeholder?: string;
  groupHeading?: string;
  badgeTone?: 'destructive' | 'default';
  badgeText?: string;
};

export function DialogSingleSelect({
  open,
  setOpen,
  options,
  onSelect,
  placeholder = 'Select an option...',
  groupHeading = '',
  badgeText,
  badgeTone = 'default',
}: DialogSingleSelectProps) {
  const [search, setSearch] = React.useState('');
  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter((option) =>
      (option.title || option.id).toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, options]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
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
      />
      <CommandList>
        <CommandGroup heading={groupHeading}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <CommandItem
                key={option.id}
                onSelect={() => {
                  onSelect(option);
                  setOpen(false);
                }}
              >
                {option.title || option.id}
              </CommandItem>
            ))
          ) : (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
