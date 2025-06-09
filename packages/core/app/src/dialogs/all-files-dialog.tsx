import { useCoreServices } from '@bangle.io/context';
import {
  rankedFuzzySearch,
  substringFuzzySearch,
} from '@bangle.io/fuzzysearch';
import {
  CommandBadge,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@bangle.io/ui-components';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtom, useAtomValue } from 'jotai';
import React, { useMemo, useRef } from 'react';

/** A command dialog for searching and navigating to any file within the current workspace. */
export function AllFilesDialog() {
  const { workbenchState } = useCoreServices();
  const [open, setOpen] = useAtom(workbenchState.$openAllFiles);
  const [search, setSearch] = useAtom(workbenchState.$allFilesSearchInput);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      shouldFilter={false}
      screenReaderTitle={t.app.dialogs.allFiles.title}
    >
      <CommandBadge>
        <span>{t.app.dialogs.allFiles.title}</span>
      </CommandBadge>
      <CommandInput
        placeholder={t.app.dialogs.allFiles.searchPlaceholder}
        value={search}
        onValueChange={setSearch}
      />
      <AllFilesContent search={search} onClose={() => setOpen(false)} />
    </CommandDialog>
  );
}

interface AllFilesContentProps {
  search: string;
  onClose: () => void;
}

function AllFilesContent({ search, onClose }: AllFilesContentProps) {
  const { workspaceState, commandDispatcher } = useCoreServices();
  const wsPaths = useAtomValue(workspaceState.$wsPaths);
  const parentRef = useRef<HTMLDivElement>(null);

  const files = useMemo(() => {
    return wsPaths.map((wsPath) => {
      const filePath = wsPath.filePath;
      return {
        id: wsPath.wsPath,
        title: filePath,
        onSelect: () => {
          onClose();
          commandDispatcher.dispatch(
            'command::ws:go-ws-path',
            { wsPath: wsPath.wsPath },
            'ui',
          );
        },
      };
    });
  }, [wsPaths, commandDispatcher, onClose]);

  const filteredFiles = useMemo(() => {
    if (!search) return files;
    const results = rankedFuzzySearch(
      search,
      files.map((file) => file.title),
      {
        fuzzySearchFunction: substringFuzzySearch,
      },
    );
    const resultSet = new Set(results.map((r) => r.item));
    return files.filter((file) => resultSet.has(file.title));
  }, [files, search]);

  const rowVirtualizer = useVirtualizer({
    count: filteredFiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 5,
  });

  return (
    <CommandList ref={parentRef}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const file = filteredFiles[virtualRow.index];
          if (!file) {
            return null;
          }
          return (
            <div
              key={file.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                width: '100%',
              }}
            >
              <CommandItem onSelect={file.onSelect}>
                <span>{file.title}</span>
              </CommandItem>
            </div>
          );
        })}
      </div>
      <CommandEmpty>
        <span>{t.app.dialogs.allFiles.emptyMessage}</span>
      </CommandEmpty>
    </CommandList>
  );
}
