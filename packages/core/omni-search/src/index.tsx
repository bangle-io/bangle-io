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
import { useAtom, useAtomValue } from 'jotai';

import {
  defaultFuzzySearch,
  rankedFuzzySearch,
  substringFuzzySearch,
} from '@bangle.io/fuzzysearch';

import { assertSplitWsPath } from '@bangle.io/ws-path';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  goToCommandRoute,
}: {
  baseItems: CommandItemProp[];
  recentWsPaths: string[];
  recentCommands: string[];
  goToCommandRoute: () => void;
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
      .slice(0, MAX_RECENT_COMMANDS);

    const recentIds = new Set(recentCmds.map((cmd) => cmd.id));

    // Get remaining commands sorted alphabetically
    const remainingCommands = commands
      .filter((cmd) => !recentIds.has(cmd.id))
      .sort((a, b) => a.title.localeCompare(b.title));

    // Calculate how many additional commands we can show
    const additionalCommandsCount = Math.max(
      0,
      MAX_COMMANDS_PER_GROUP - recentCmds.length,
    );
    const regularCommands = remainingCommands.slice(0, additionalCommandsCount);

    const viewAllCommand: CommandItemProp = {
      id: 'view-all-commands',
      title: 'View All Commands',
      metadata: { type: 'command', cmd: { id: 'view-all-commands', args: {} } },
      onSelect: goToCommandRoute,
    };

    return [...recentCmds, ...regularCommands, viewAllCommand];
  }, [baseItems, recentCommands, goToCommandRoute]);

  const allFiles = useMemo(() => {
    return baseItems
      .filter((item) => item.metadata.type === 'file')
      .sort((a, b) => a.title.localeCompare(b.title))
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
        id: item.id,
      }));

    return recentFiles;
  }, [allFiles, recentWsPaths]);

  return (
    <>
      {recentFiles.length > 0 && (
        <>
          <CommandGroupSection heading="Recent Notes" items={recentFiles} />
          <CommandSeparator />
        </>
      )}
      <CommandGroupSection heading="> Commands" items={allCommands} />
      <CommandSeparator />
      <CommandGroupSection heading="All Notes" items={allFiles} />
    </>
  );
}

// Update CommandRoute component
function CommandRoute({
  baseItems,
  search,
}: { baseItems: CommandItemProp[]; search: string }) {
  React.useEffect(() => {
    let unmounted = false;
    // for some reason scroll goes to the bottom when changing routes
    requestAnimationFrame(() => {
      const firstItem = document.querySelector('[cmdk-list]');
      if (firstItem && !unmounted) {
        firstItem.scrollTop = 0;
      }
    });
    return () => {
      unmounted = true;
    };
  }, []);

  const items = useMemo(
    () =>
      baseItems
        .filter((item) => item.metadata.type === 'command')
        .sort((a, b) => a.title.localeCompare(b.title)),
    [baseItems],
  );

  const commands = useMemo(() => {
    return searchItems(items, search);
  }, [items, search]);

  return <CommandGroupSection heading="> Commands" items={commands} />;
}

function FilteredRoute({
  baseItems,
  search,
  recentWsPaths,
  recentCommands,
}: {
  baseItems: CommandItemProp[];
  search: string;
  recentWsPaths: string[];
  recentCommands: string[];
}) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, []);

  const filteredItems = useMemo(() => {
    return searchItems(baseItems, search, { recentCommands, recentWsPaths });
  }, [baseItems, search, recentCommands, recentWsPaths]);

  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 7,
    scrollPaddingStart: 24,
  });

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <CommandGroup
      heading={'Filtered'}
      ref={parentRef}
      style={{ height: '428px', overflowY: 'auto' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          // biome-ignore lint/style/noNonNullAssertion: <explanation>
          const item = filteredItems[virtualRow.index]!;
          const key = item.id;
          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                width: '100%',
              }}
            >
              <CommandItem id={key} title={item.title} onSelect={item.onSelect}>
                <span>
                  {item.metadata.type === 'command' ? '> ' : ''}
                  {item.title}
                </span>
                {item.keybindings && <KbdShortcut keys={item.keybindings} />}
              </CommandItem>
            </div>
          );
        })}
      </div>
    </CommandGroup>
  );
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
  const commandInputRef = React.useRef<HTMLInputElement>(null);
  const {
    workspaceState,
    commandDispatcher,
    userActivityService,
    workbenchState,
  } = useCoreServices();
  const wsPaths = useAtomValue(workspaceState.$wsPaths);
  const [search, updateSearch] = useAtom(workbenchState.$omniSearchInput);
  const route = useAtomValue(workbenchState.$omniSearchRoute);
  const recentWsPaths = useAtomValue(userActivityService.$recentWsPaths);
  const recentCommands = useAtomValue(userActivityService.$recentCommands);
  const cleanedSearch = useAtomValue(workbenchState.$cleanSearchTerm);

  const baseItems: CommandItemProp[] = React.useMemo(() => {
    const filteredCommands = commands.map(
      (cmd): CommandItemProp => ({
        id: `cmd-${cmd.id}`,
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
        id: `file-${wsPath}`,
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

    return [...filteredCommands, ...filteredFiles];
  }, [commands, wsPaths, onCommand, commandDispatcher, setOpen]);

  const goToCommandRoute = React.useCallback(() => {
    workbenchState.goToCommandRoute();
    commandInputRef.current?.focus();
  }, [workbenchState]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          workbenchState.resetOmniSearch();
        }
      }}
      shouldFilter={false}
      screenReaderTitle="omni command bar"
    >
      <CommandInput
        ref={commandInputRef}
        placeholder="Type a command or search..."
        value={search}
        onValueChange={(value) => {
          updateSearch(value);
        }}
      />
      <CommandList className="max-h-[428px]">
        {route === 'omni-home' && (
          <HomeRoute
            baseItems={baseItems}
            recentWsPaths={recentWsPaths}
            recentCommands={recentCommands}
            goToCommandRoute={goToCommandRoute}
          />
        )}
        {route === 'omni-command' && (
          <CommandRoute baseItems={baseItems} search={cleanedSearch} />
        )}
        {route === 'omni-filtered' && (
          <FilteredRoute
            baseItems={baseItems}
            search={cleanedSearch}
            recentWsPaths={recentWsPaths}
            recentCommands={recentCommands}
          />
        )}

        <CommandEmpty>
          <span>No results found.</span>
        </CommandEmpty>
      </CommandList>
    </CommandDialog>
  );
}

function searchItems(
  items: CommandItemProp[],
  search: string,
  opts: {
    recentCommands?: string[];
    recentWsPaths?: string[];
  } = {},
) {
  if (!search) {
    return items;
  }

  const searchables = items.map((item) => item.title);
  let fuzzyResults = rankedFuzzySearch(search, searchables, {
    fuzzySearchFunction: substringFuzzySearch,
  });

  if (fuzzyResults.length === 0) {
    fuzzyResults = rankedFuzzySearch(search, searchables, {
      fuzzySearchFunction: defaultFuzzySearch,
    });
  }

  const fuzzyResultsMap = new Map(fuzzyResults.map((r) => [r.item, r]));
  const { recentCommands = [], recentWsPaths = [] } = opts;

  const recentCommandsSet = new Set(recentCommands);
  const recentWsPathsSet = new Set(recentWsPaths);

  const scoredItems = items
    .map((item) => {
      const fuzzyMatch = fuzzyResultsMap.get(item.title);
      if (!fuzzyMatch) return null;

      let finalScore = fuzzyMatch.score;

      if (item.metadata.type === 'command') {
        if (recentCommandsSet.has(item.metadata.cmd.id)) {
          finalScore *= 4;
        } else {
          finalScore *= 2.5;
        }
      } else if (
        item.metadata.type === 'file' &&
        recentWsPathsSet.has(item.metadata.wsPath)
      ) {
        finalScore *= 1.5;
      }

      return {
        item,
        score: finalScore,
      };
    })
    .filter((r): r is { item: CommandItemProp; score: number } => r !== null);

  return scoredItems
    .sort((a, b) => b.score - a.score)
    .map((result) => result.item);
}
