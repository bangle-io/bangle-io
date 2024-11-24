import type { Command } from '@bangle.io/types';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@bangle.io/ui-components';
import React from 'react';

export function OmniSearch({
  open,
  setOpen,
  commands,
  onCommand,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  commands: Command[];
  onCommand: (cmd: Command) => void;
}) {
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        {commands.length > 0 ? (
          commands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              onSelect={() => {
                onCommand(cmd);
                setOpen(false);
              }}
            >
              {cmd.title || cmd.id}
            </CommandItem>
          ))
        ) : (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
      </CommandList>
    </CommandDialog>
  );
}
