import React, { createRef } from 'react';
import { useWatchClickOutside } from 'bangle-io/app/misc/hooks';

import { useFilePalette } from './Palettes/FilePalette';
import { PaletteInput } from './PaletteInput';
import { useWorkspacePalette } from './Palettes/WorkspacePalette';
import { PaletteType } from './PaletteType';

const parseRawQuery = (rawQuery, paletteType) => {
  // Some of the types depend on the current active query
  // for example if query starts with `>`, it becomes a command type
  // and if a user backspaces `>` it defaults to file.
  // but thats not true for all as `command/input/*` is static
  // and can only be dismissed.
  if (rawQuery.startsWith('>')) {
    return { paletteType: 'command', query: rawQuery.slice(1) };
  }

  if (rawQuery.startsWith('ws:')) {
    return { paletteType: 'workspace', query: rawQuery.slice(3) };
  }

  // Disallow changing of palette type
  if (paletteType.startsWith('command/input/')) {
    return { paletteType, query: rawQuery };
  }

  return { paletteType: 'file', query: rawQuery };
};

const generateRawQuery = (paletteType, query) => {
  if (paletteType === 'command') {
    return '>' + query;
  }

  if (paletteType === 'workspace') {
    return 'ws:' + query;
  }

  if (paletteType.startsWith('command/input/')) {
    return query;
  }

  // defaults to file
  return query;
};

export function PaletteContainer({
  updateExecuteActiveItem,
  executeActiveItem,
  updatePaletteType,
  paletteType,
  updateCounter,
  updateQuery,
  counter,
  query,
}) {
  const paletteInputRef = createRef();

  const containerRef = useWatchClickOutside(
    () => {
      updatePaletteType(null);
    },
    () => {
      paletteInputRef.current.focus();
    },
  );
  const filePaletteItems = useFilePalette({ query });
  const workspacePaletteItems = useWorkspacePalette({ query });

  const onDismiss = () => {
    updatePaletteType(null);
  };
  return (
    <div
      className="bangle-palette z-30 p-2 shadow-md border flex flex-col"
      ref={containerRef}
    >
      <PaletteInput
        ref={paletteInputRef}
        onDismiss={onDismiss}
        onPressEnter={() => {
          // To prevent multiple executions
          if (!executeActiveItem) {
            updateExecuteActiveItem(true);
          }
        }}
        updateCounter={updateCounter}
        updateQuery={(rawQuery) => {
          const initialPaletteType = paletteType;
          const { paletteType: newType, query } = parseRawQuery(
            rawQuery,
            initialPaletteType,
          );

          if (newType !== initialPaletteType) {
            updatePaletteType(newType, query);
          } else {
            updateQuery(query);
          }
        }}
        query={generateRawQuery(paletteType, query)}
        counter={counter}
      />
      <PaletteType
        match={/^file$/}
        paletteItems={filePaletteItems}
        executeActiveItem={executeActiveItem}
        counter={counter}
        paletteType={paletteType}
        onDismiss={onDismiss}
      />
      <PaletteType
        match={/^workspace$/}
        paletteItems={workspacePaletteItems}
        executeActiveItem={executeActiveItem}
        counter={counter}
        paletteType={paletteType}
        onDismiss={onDismiss}
      />
      {/* <PaletteItem match={/^(command|command\/input\/.*)$/}>
        <CommandPalette {...props} />
      </PaletteItem>  */}
    </div>
  );
}
