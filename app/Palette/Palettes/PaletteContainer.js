import React, { createRef, useContext } from 'react';
import { useFilePalette } from './FilePalette';
import { PaletteInput } from '../PaletteInput';
import { useWorkspacePalette } from './WorkspacePalette';
import { useKeybindings, useWatchClickOutside } from 'bangle-io/app/misc/hooks';
import { PaletteContext } from '../PaletteContext';
import { PaletteType } from './PaletteType';

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
};

export function PaletteContainer() {
  usePaletteKeybindings();
  const paletteState = useContext(PaletteContext);
  const paletteInputRef = createRef();
  const containerRef = useWatchClickOutside(paletteState.clear, () => {
    paletteInputRef.current.focus();
  });

  if (!paletteState.current) {
    return null;
  }

  const { type, subQuery } = paletteState.current;

  return (
    <div
      className="bangle-palette z-30 p-2 shadow-md border flex flex-col"
      ref={containerRef}
    >
      <PaletteInput
        ref={paletteInputRef}
        onDismiss={paletteState.clear}
        onPressEnter={() => {
          if (!paletteState.execute) {
            paletteState.onExecute();
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
      <PaletteItems paletteState={paletteState} />
    </div>
  );
}

function PaletteItems({ paletteState }) {
  const query = paletteState.current?.subQuery;
  const filePalette = useFilePalette({ query });
  const workspacePalette = useWorkspacePalette({ query });

  return (
    <>
      {/* <PaletteItem match={/^(command|command\/input\/.*)$/}>
        <CommandPalette {...props} />
      </PaletteItem> */}
      <PaletteType
        match={/^file$/}
        items={filePalette.items}
        executeItem={filePalette.executeItem}
      />
      <PaletteType
        match={/^workspace$/}
        items={workspacePalette.items}
        executeItem={workspacePalette.executeItem}
      />
    </>
  );
}

function usePaletteKeybindings() {
  const paletteState = useContext(PaletteContext);

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
