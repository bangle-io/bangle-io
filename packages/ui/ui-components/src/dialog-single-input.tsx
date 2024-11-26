import { CommandGroup } from 'cmdk';
import React from 'react';
import {
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
}: DialogSingleInputProps) {
  const [search, setSearch] = React.useState('');
  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput
        placeholder={placeholder}
        value={search}
        onValueChange={setSearch}
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
