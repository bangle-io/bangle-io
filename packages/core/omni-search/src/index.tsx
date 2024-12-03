import { useCoreServices } from '@bangle.io/context';
import type { Command } from '@bangle.io/types';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  KbdShortcut,
} from '@bangle.io/ui-components';
import { useAtomValue } from 'jotai';

import { fuzzySearch } from '@bangle.io/fuzzysearch';

import { assertSplitWsPath } from '@bangle.io/ws-path';
import React, { useMemo } from 'react';

const MAX_COMMANDS_PER_GROUP = 5;
const MAX_FILES_GLOBAL = 100;
const MAX_RECENT_FILES = 5;
const MAX_RECENT_COMMANDS = 3;

type CommandItemProp = {
  id: string;
  title: string;
  keybindings?: string[];
  keywords?: string[];
  metadata:
    | {
        type: 'command';
        cmd: Command;
      }
    | {
        type: 'file';
        wsPath: string;
        filePath: string;
        wsName: string;
      };
  onSelect: () => void;
};

type Route = 'home' | 'command' | 'filtered';

function useOmniRoute(search: string): Route {
  return useMemo(() => {
    if (search === '') {
      return 'home';
    }
    if (search.startsWith('>')) {
      return 'command';
    }
    return 'filtered';
  }, [search]);
}

function cleanSearchTerm(search: string, route: Route): string {
  if (route === 'command') {
    return search.slice(1).trim().toLowerCase();
  }
  return search.trim().toLowerCase();
}

function CommandGroupSection({
  heading,
  items,
}: {
  heading?: string;
  items: CommandItemProp[];
}) {
  return (
    <CommandGroup heading={heading}>
      {items.map((item) => (
        <CommandItem
          key={item.id}
          id={item.id}
          title={item.title}
          onSelect={item.onSelect}
        >
          <span>{item.title}</span>
          {item.keybindings && <KbdShortcut keys={item.keybindings} />}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

// Define route components
function HomeRoute({
  baseItems,
  recentWsPaths,
  recentCommands,
}: {
  baseItems: CommandItemProp[];
  recentWsPaths: string[];
  recentCommands: string[];
}) {
  const allCommands = useMemo(() => {
    const commands = baseItems.filter(
      (item) => item.metadata.type === 'command',
    );

    const recentCmds = recentCommands
      .map((cmdId) =>
        commands.find((item) =>
          item.metadata.type === 'command'
            ? item.metadata.cmd.id === cmdId
            : false,
        ),
      )
      .filter((r): r is CommandItemProp => Boolean(r))
      .slice(0, MAX_RECENT_COMMANDS)
      .map((item) => ({ ...item }));

    const recentIds = new Set(recentCmds.map((cmd) => cmd.id));

    const remainingCommands = commands
      .filter((cmd) => !recentIds.has(cmd.id))
      .slice(0, MAX_COMMANDS_PER_GROUP)
      .sort((a, b) => a.title.localeCompare(b.title));

    return [...recentCmds, ...remainingCommands];
  }, [baseItems, recentCommands]);

  const allFiles = useMemo(() => {
    return baseItems
      .filter((item) => item.metadata.type === 'file')
      .slice(0, MAX_FILES_GLOBAL);
  }, [baseItems]);

  const recentFiles = useMemo(() => {
    const recentFiles = recentWsPaths
      .map((wsPath) =>
        allFiles.find((item) =>
          item.metadata.type === 'file'
            ? item.metadata.wsPath === wsPath
            : false,
        ),
      )
      .filter((r): r is CommandItemProp => Boolean(r))
      .slice(0, MAX_RECENT_FILES)
      .map((item) => ({
        ...item,
        id: `recent-${item.id}`,
      }));

    return recentFiles;
  }, [allFiles, recentWsPaths]);

  return (
    <>
      <CommandGroupSection heading="> Commands" items={allCommands} />
      <CommandSeparator />
      {recentFiles.length > 0 && (
        <>
          <CommandGroupSection heading="Recent Notes" items={recentFiles} />
          <CommandSeparator />
        </>
      )}
      <CommandGroupSection heading="All Notes" items={allFiles} />
    </>
  );
}

function CommandRoute({
  baseItems,
  search,
}: {
  baseItems: CommandItemProp[];
  search: string;
}) {
  const items = useMemo(
    () =>
      baseItems
        .filter((item) => item.metadata.type === 'command')
        .sort((a, b) => a.title.localeCompare(b.title)),
    [baseItems],
  );
  const commands = useMemo(() => {
    if (!search) return items;
    return items.filter(
      (item) =>
        fuzzySearch(search, item.title) ||
        item.keywords?.some((keyword) => fuzzySearch(search, keyword)),
    );
  }, [items, search]);

  return <CommandGroupSection heading="> Commands" items={commands} />;
}

function FilteredRoute({
  baseItems,
  search,
  recentWsPaths,
}: {
  baseItems: CommandItemProp[];
  search: string;
  recentWsPaths: string[];
}) {
  const filteredItems = useMemo(() => {
    if (!search) return baseItems;
    const matchingItems = baseItems.filter(
      (item) =>
        fuzzySearch(search, item.title) ||
        item.keywords?.some((keyword) => fuzzySearch(search, keyword)),
    );

    // Sort matching items to prioritize recent files
    return matchingItems.sort((a, b) => {
      if (a.metadata.type === 'file' && b.metadata.type === 'file') {
        const aIsRecent = recentWsPaths.includes(a.metadata.wsPath);
        const bIsRecent = recentWsPaths.includes(b.metadata.wsPath);
        if (aIsRecent !== bIsRecent) {
          return aIsRecent ? -1 : 1;
        }
      }
      return 0;
    });
  }, [baseItems, search, recentWsPaths]);

  return <CommandGroupSection items={filteredItems} />;
}

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
  const { workspaceState, commandDispatcher, userActivityService } =
    useCoreServices();
  const wsPaths = useAtomValue(workspaceState.$wsPaths);
  const [search, setSearch] = React.useState('');

  const recentWsPaths = useAtomValue(userActivityService.$recentWsPaths);
  const recentCommands = useAtomValue(userActivityService.$recentCommands);

  const route = useOmniRoute(search);
  const cleanedSearch = cleanSearchTerm(search, route);

  const baseItems: CommandItemProp[] = React.useMemo(() => {
    const filteredCommands = commands.map(
      (cmd): CommandItemProp => ({
        id: 'cmd-' + cmd.id,
        title: cmd.title || cmd.id,
        keybindings: cmd.keybindings,
        keywords: cmd.keywords,
        metadata: { type: 'command', cmd: cmd },
        onSelect: () => {
          onCommand(cmd);
          setOpen(false);
        },
      }),
    );

    const filteredFiles = wsPaths.map((wsPath): CommandItemProp => {
      const { wsName, filePath } = assertSplitWsPath(wsPath);
      return {
        id: 'file-' + wsPath,
        title: filePath,
        metadata: {
          type: 'file',
          wsPath,
          filePath,
          wsName,
        },
        onSelect: () => {
          setOpen(false);
          commandDispatcher.dispatch(
            'command::ws:go-ws-path',
            { wsPath: wsPath },
            'ui',
          );
        },
      };
    });

    const combinedItems = [...filteredCommands, ...filteredFiles];
    return combinedItems;
  }, [commands, setOpen, wsPaths, onCommand, commandDispatcher]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          setSearch('');
        }
      }}
      shouldFilter={false}
      screenReaderTitle="omni command bar"
    >
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {route === 'home' && (
          <HomeRoute
            baseItems={baseItems}
            recentWsPaths={recentWsPaths}
            recentCommands={recentCommands}
          />
        )}
        {route === 'command' && (
          <CommandRoute baseItems={baseItems} search={cleanedSearch} />
        )}
        {route === 'filtered' && (
          <FilteredRoute
            baseItems={baseItems}
            search={cleanedSearch}
            recentWsPaths={recentWsPaths}
          />
        )}
      </CommandList>
    </CommandDialog>
  );
}
