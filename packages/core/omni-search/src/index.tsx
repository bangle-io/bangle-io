import { useCoreServices } from '@bangle.io/context';
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
  KbdShortcut,
} from '@bangle.io/ui-components';
import { useAtomValue } from 'jotai';

import { resolvePath } from '@bangle.io/ws-path';
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
  const { workspaceState, commandDispatcher } = useCoreServices();
  const wsPaths = useAtomValue(workspaceState.$wsPaths);

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
              <span>{cmd.title || cmd.id}</span>
              {cmd.keybindings && <KbdShortcut keys={cmd.keybindings} />}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Notes">
          {wsPaths.map((wsPath) => (
            <CommandItem
              key={wsPath}
              onSelect={() => {
                setOpen(false);
                commandDispatcher.dispatch(
                  'command::ws:go-ws-path',
                  { wsPath: wsPath },
                  'ui',
                );
              }}
            >
              <span>{resolvePath(wsPath).filePath}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
