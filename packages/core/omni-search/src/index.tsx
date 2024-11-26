import type { Command } from '@bangle.io/types';
import {
  CommandBadge,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@bangle.io/ui-components';
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
} from 'lucide-react';

import React, {} from 'react';
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
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Commands">
          {commands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              onSelect={() => {
                onCommand(cmd);
                setOpen(false);
              }}
            >
              {cmd.title || cmd.id}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
