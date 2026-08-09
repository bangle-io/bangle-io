import {
  type EditorAction,
  type EditorEngineContract,
  useCoreServices,
} from '@bangle.io/context';
import {
  defaultFuzzySearch,
  rankedFuzzySearch,
  substringFuzzySearch,
} from '@bangle.io/fuzzysearch';
import type { Command } from '@bangle.io/types';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandMenuRow,
  CommandSeparator,
} from '@bangle.io/ui-components';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtom, useAtomValue } from 'jotai';
import { FileText, SquareChevronRight } from 'lucide-react';
import React, { useMemo } from 'react';
import {
  type ContentSearchResult,
  MIN_CONTENT_SEARCH_QUERY_LENGTH,
  searchWorkspaceContent,
} from './content-search';

const MAX_COMMANDS_PER_GROUP = 5;
const MAX_FILES_GLOBAL = 100;
const MAX_RECENT_FILES = 5;
const MAX_RECENT_COMMANDS = 3;
const CONTENT_SEARCH_DEBOUNCE_MS = 250;

const EDITOR_ACTIONS_BY_COMMAND_ID: Readonly<Record<string, EditorAction>> = {
  'command::editor:toggle-heading-1': {
    type: 'toggle-heading',
    level: 1,
  },
  'command::editor:toggle-heading-2': {
    type: 'toggle-heading',
    level: 2,
  },
  'command::editor:toggle-heading-3': {
    type: 'toggle-heading',
    level: 3,
  },
  'command::editor:insert-table': { type: 'insert-table' },
};

function isCommandAvailable(
  commandId: string,
  editorEngine: EditorEngineContract,
): boolean {
  const editorAction = EDITOR_ACTIONS_BY_COMMAND_ID[commandId];
  return !editorAction || editorEngine.isActionAvailable(editorAction);
}

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

function itemIcon(item: CommandItemProp) {
  return item.metadata.type === 'command' ? (
    <SquareChevronRight aria-hidden />
  ) : (
    <FileText aria-hidden />
  );
}

type ContentSearchState = {
  status: 'idle' | 'searching' | 'complete';
  matches: ContentSearchResult[];
  failedFileCount: number;
};

const EMPTY_CONTENT_SEARCH_STATE: ContentSearchState = {
  status: 'idle',
  matches: [],
  failedFileCount: 0,
};

function useWorkspaceContentSearch({
  active,
  query,
  wsPaths,
  currentWsPath,
  recentWsPaths,
  readText,
}: {
  active: boolean;
  query: string;
  wsPaths: string[];
  currentWsPath?: string;
  recentWsPaths: string[];
  readText: (
    wsPath: string,
    signal: AbortSignal,
  ) => Promise<string | undefined>;
}): ContentSearchState {
  const [state, setState] = React.useState<ContentSearchState>(
    EMPTY_CONTENT_SEARCH_STATE,
  );
  const searchRunId = React.useRef(0);

  React.useEffect(() => {
    const runId = ++searchRunId.current;
    if (!active || query.length < MIN_CONTENT_SEARCH_QUERY_LENGTH) {
      setState(EMPTY_CONTENT_SEARCH_STATE);
      return;
    }

    const abortController = new AbortController();
    const isCurrentRun = () =>
      searchRunId.current === runId && !abortController.signal.aborted;
    setState({ status: 'searching', matches: [], failedFileCount: 0 });

    const timeoutId = setTimeout(() => {
      void searchWorkspaceContent({
        wsPaths,
        currentWsPath,
        recentWsPaths,
        query,
        signal: abortController.signal,
        readText,
        onMatch: (match) => {
          if (!isCurrentRun()) {
            return;
          }
          setState((current) => ({
            ...current,
            matches: [...current.matches, match],
          }));
        },
      })
        .then((result) => {
          if (!isCurrentRun()) {
            return;
          }
          setState({
            status: 'complete',
            matches: result.matches,
            failedFileCount: result.failedFileCount,
          });
        })
        .catch(() => {
          if (!isCurrentRun()) {
            return;
          }
          setState((current) => ({
            ...current,
            status: 'complete',
            failedFileCount: current.failedFileCount + 1,
          }));
        });
    }, CONTENT_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [active, currentWsPath, query, readText, recentWsPaths, wsPaths]);

  return state;
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
          <CommandMenuRow
            icon={itemIcon(item)}
            title={item.title}
            keybindings={item.keybindings}
          />
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
      title: t.app.omniSearch.viewAllCommands,
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
          <CommandGroupSection
            heading={t.app.omniSearch.recentNotesHeading}
            items={recentFiles}
          />
          <CommandSeparator />
        </>
      )}
      <CommandGroupSection
        heading={t.app.omniSearch.commandsHeading}
        items={allCommands}
      />
      <CommandSeparator />
      <CommandGroupSection
        heading={t.app.omniSearch.allFilesHeading}
        items={allFiles}
      />
    </>
  );
}

// Update CommandRoute component
function CommandRoute({
  baseItems,
  search,
}: {
  baseItems: CommandItemProp[];
  search: string;
}) {
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

  return (
    <CommandGroupSection
      heading={t.app.omniSearch.commandsHeading}
      items={commands}
    />
  );
}

function FilteredRoute({
  baseItems,
  search,
  recentWsPaths,
  recentCommands,
  contentSearch,
}: {
  baseItems: CommandItemProp[];
  search: string;
  recentWsPaths: string[];
  recentCommands: string[];
  contentSearch: ContentSearchState;
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

  const displayItems = useMemo(() => {
    const contentMatchesByWsPath = new Map(
      contentSearch.matches.map((match) => [match.wsPath, match]),
    );
    const fileItemsByWsPath = new Map(
      baseItems.flatMap((item) =>
        item.metadata.type === 'file'
          ? ([[item.metadata.wsPath, item]] as const)
          : [],
      ),
    );
    const includedFilePaths = new Set<string>();
    const results: Array<{
      item: CommandItemProp;
      contentMatch?: ContentSearchResult;
    }> = filteredItems.map((item) => {
      if (item.metadata.type === 'file') {
        includedFilePaths.add(item.metadata.wsPath);
        return {
          item,
          contentMatch: contentMatchesByWsPath.get(item.metadata.wsPath),
        };
      }
      return { item };
    });

    for (const contentMatch of contentSearch.matches) {
      if (includedFilePaths.has(contentMatch.wsPath)) {
        continue;
      }
      const item = fileItemsByWsPath.get(contentMatch.wsPath);
      if (item) {
        results.push({ item, contentMatch });
      }
    }

    return results;
  }, [baseItems, contentSearch.matches, filteredItems]);

  const rowVirtualizer = useVirtualizer({
    count: displayItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 7,
    scrollPaddingStart: 24,
  });

  const statusMessage =
    contentSearch.status === 'searching'
      ? t.app.omniSearch.searchingNoteContents
      : contentSearch.failedFileCount > 0
        ? t.app.omniSearch.partialResults({
            count: contentSearch.failedFileCount,
          })
        : undefined;

  if (displayItems.length === 0) {
    return statusMessage && contentSearch.status !== 'searching' ? (
      <div className="px-4 pb-3 text-muted-foreground text-xs" role="status">
        {statusMessage}
      </div>
    ) : null;
  }

  return (
    <>
      <CommandGroup
        heading={t.app.omniSearch.filteredHeading}
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
            const result = displayItems[virtualRow.index];
            if (!result) {
              return null;
            }
            const { item, contentMatch } = result;
            const key = item.id;
            return (
              <div
                data-index={virtualRow.index}
                key={key}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  width: '100%',
                }}
              >
                <CommandItem
                  id={key}
                  title={item.title}
                  onSelect={item.onSelect}
                >
                  <CommandMenuRow
                    icon={itemIcon(item)}
                    title={item.title}
                    description={
                      contentMatch ? (
                        <>
                          {contentMatch.snippet.before}
                          <mark className="rounded-sm bg-pop px-0.5 text-pop-foreground">
                            {contentMatch.snippet.match}
                          </mark>
                          {contentMatch.snippet.after}
                        </>
                      ) : undefined
                    }
                    keybindings={item.keybindings}
                  />
                </CommandItem>
              </div>
            );
          })}
        </div>
      </CommandGroup>
      {statusMessage && (
        <div className="px-4 pb-3 text-muted-foreground text-xs" role="status">
          {statusMessage}
        </div>
      )}
    </>
  );
}
export function OmniSearch() {
  const {
    workspaceState,
    commandDispatcher,
    fileSystem,
    userActivityService,
    workbenchState,
    commandRegistry,
    editorEngine,
  } = useCoreServices();
  const [open, setOpen] = useAtom(workbenchState.$openOmniSearch);
  const activeWsName = useAtomValue(workspaceState.$currentWsName);
  const activeWsPath = useAtomValue(workspaceState.$currentWsPath);
  const omniSearchScope = activeWsPath
    ? 'note'
    : activeWsName
      ? 'workspace'
      : 'global';
  const commands = open
    ? commandRegistry
        .getOmniSearchCommands(omniSearchScope)
        .filter((command) => isCommandAvailable(command.id, editorEngine))
    : [];

  const commandInputRef = React.useRef<HTMLInputElement>(null);

  const wsPaths = useAtomValue(workspaceState.$wsPaths);
  const noteWsPaths = useAtomValue(workspaceState.$noteWsPaths);
  const [search, updateSearch] = useAtom(workbenchState.$omniSearchInput);
  const route = useAtomValue(workbenchState.$omniSearchRoute);
  const recentWsPaths = useAtomValue(userActivityService.$recentWsPaths);
  const recentCommands = useAtomValue(userActivityService.$recentCommands);
  const cleanedSearch = useAtomValue(workbenchState.$cleanSearchTerm);
  const wsPathStrings = useMemo(
    () => noteWsPaths.map((wsPath) => wsPath.wsPath),
    [noteWsPaths],
  );
  const readText = React.useCallback(
    (wsPath: string, signal: AbortSignal) =>
      fileSystem.readFileAsText(wsPath, { signal }),
    [fileSystem],
  );
  const contentSearch = useWorkspaceContentSearch({
    active: open && route === 'omni-filtered',
    query: cleanedSearch,
    wsPaths: wsPathStrings,
    currentWsPath: activeWsPath?.wsPath,
    recentWsPaths,
    readText,
  });

  const onCommand = React.useCallback(
    (cmd: Command) => {
      setOpen(false);
      requestAnimationFrame(() => {
        commandDispatcher.dispatch(
          // @ts-expect-error - command id will be correct
          cmd.id,
          {},
          'omni-search',
        );
      });
    },
    [commandDispatcher, setOpen],
  );

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
      const { wsName, filePath } = wsPath;
      return {
        id: `file-${wsPath}`,
        title: filePath,
        metadata: {
          type: 'file',
          wsPath: wsPath.wsPath,
          filePath,
          wsName,
        },
        onSelect: () => {
          setOpen(false);
          commandDispatcher.dispatch(
            'command::ws:go-ws-path',
            { wsPath: wsPath.wsPath },
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
      screenReaderTitle={t.app.omniSearch.dialogTitle}
    >
      <CommandInput
        ref={commandInputRef}
        placeholder={t.app.omniSearch.inputPlaceholder}
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
            contentSearch={contentSearch}
          />
        )}

        <CommandEmpty>
          <span>
            {contentSearch.status === 'searching'
              ? t.app.omniSearch.searchingNoteContents
              : t.app.omniSearch.noResults}
          </span>
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
