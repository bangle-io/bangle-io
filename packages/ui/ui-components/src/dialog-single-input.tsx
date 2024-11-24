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
};

/**
 * A simple dialog with a single input field a
 */
export function DialogSingleInput({
  open,
  setOpen,
  command,
  onRun: onCommand,
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
      </CommandList>
    </CommandDialog>
  );
}
