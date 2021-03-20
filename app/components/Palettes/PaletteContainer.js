import React, { createRef, useContext } from 'react';
import { CommandPalette } from './CommandPalette';
import { FilePalette } from './FilePalette';
import { Palette } from '../../helper-ui/Palette';
import { WorkspacePalette } from './WorkspacePalette';
import { PaletteSwitchContext } from 'bangle-io/app/helper-ui/Switch';
import { useKeybindings, useWatchClickOutside } from 'bangle-io/app/misc/hooks';

const parseRawQuery = (query, paletteType) => {
  // Some of the types depend on the current active query
  // for example if query starts with `>`, it becomes a command type
  // and if a user backspaces `>` it defaults to file.
  // but thats not true for all as `command/input/*` is static
  // and can only be dismissed.
  if (query.startsWith('>')) {
    return { paletteType: 'command', subQuery: query.slice(1) };
  }

  if (query.startsWith('ws:')) {
    return { paletteType: 'workspace', subQuery: query.slice(3) };
  }

  // Disallow changing of palette type
  if (paletteType.startsWith('command/input/')) {
    return { paletteType, subQuery: query };
  }

  return { paletteType: 'file', subQuery: query };
};

const generateRawQuery = (paletteType, subQuery) => {
  if (paletteType === 'command') {
    return '>' + subQuery;
  }

  if (paletteType === 'workspace') {
    return 'ws:' + subQuery;
  }

  if (paletteType.startsWith('command/input/')) {
    return subQuery;
  }

  // defaults to file
  return subQuery;
};

const defaultValues = {
  type: 'file',
  subQuery: '',
  counter: 0,
  onExecute: null,
};

export function PaletteContainer() {
  usePaletteKeybindings();
  const paletteState = useContext(PaletteSwitchContext);
  const paletteInputRef = createRef();
  const containerRef = useWatchClickOutside(paletteState.clear, () => {
    paletteInputRef.current.focus();
  });

  if (!paletteState.current) {
    return null;
  }

  const { type, counter, subQuery } = paletteState.current;

  const props = {
    type,
    counter: counter,
    query: subQuery,
    execute: false,
    onDismiss: paletteState.clear,
  };

  return (
    <div
      className="bangle-palette z-30 p-2 shadow-md border flex flex-col"
      ref={containerRef}
    >
      <Palette
        ref={paletteInputRef}
        onDismiss={paletteState.clear}
        onPressEnter={() => {
          if (paletteState.current.onExecute) {
            paletteState.current.onExecute();
          }
        }}
        updateCounter={(counter) => {
          paletteState.updateCurrent({ counter });
        }}
        updateQuery={(rawQuery) => {
          const initialPaletteType = paletteState.current.type;
          const { paletteType, subQuery } = parseRawQuery(
            rawQuery,
            initialPaletteType,
          );
          paletteState.updateCurrent({
            type: paletteType,
            subQuery,
          });
        }}
        query={generateRawQuery(type, subQuery)}
        counter={paletteState.current.counter}
      />
      <PaletteItem match={/^(command|command\/input\/.*)$/}>
        <CommandPalette {...props} />
      </PaletteItem>
      <PaletteItem match={/^file$/}>
        <FilePalette {...props} />
      </PaletteItem>
      <PaletteItem match={/^workspace$/}>
        <WorkspacePalette {...props} />
      </PaletteItem>
    </div>
  );
}

function PaletteItem({ match, children }) {
  const paletteState = useContext(PaletteSwitchContext);

  if (!paletteState.current) {
    return null;
  }

  const { type } = paletteState.current;

  if (!match.test(type)) {
    return null;
  }
  return children;
}

function usePaletteKeybindings() {
  const paletteState = useContext(PaletteSwitchContext);

  useKeybindings(() => {
    return {
      'Mod-P': () => {
        if (paletteState.current && paletteState.current.type === 'command') {
          paletteState.updateCurrent((val) => ({
            counter: val.counter + 1,
          }));
          return true;
        }

        paletteState.push({
          ...defaultValues,
          type: 'command',
        });
        return true;
      },

      'Mod-p': () => {
        if (paletteState.current && paletteState.current.type === 'file') {
          paletteState.updateCurrent((val) => ({
            counter: val.counter + 1,
          }));
          return true;
        }

        paletteState.push({
          ...defaultValues,
          type: 'file',
        });

        return true;
      },

      'Ctrl-r': () => {
        if (paletteState.current && paletteState.current.type === 'workspace') {
          paletteState.updateCurrent((val) => ({
            counter: val.counter + 1,
          }));
          return true;
        }

        paletteState.push({
          ...defaultValues,
          type: 'workspace',
        });

        return true;
      },
    };
  }, [paletteState]);
}
