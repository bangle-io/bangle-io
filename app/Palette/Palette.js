import React, { useContext, useEffect } from 'react';
import { useCallback } from 'react';

import { useKeybindings } from '../misc/hooks';
import { PaletteUI } from '../PaletteUI/PaletteUI';
import { UIManagerContext } from '../UIManager';
import { useCommandPalette } from './Palettes/CommandPalette';
import { useFilePalette } from './Palettes/FilePalette';
import { useInputPalette } from './Palettes/InputPalette';
import {
  COMMAND_PALETTE,
  FILE_PALETTE,
  INPUT_PALETTE,
  WORKSPACE_PALETTE,
} from './paletteTypes';
import { useWorkspacePalette } from './Palettes/WorkspacePalette';

export function Palette() {
  const {
    paletteMetadata: metadata,
    paletteType,
    paletteInitialQuery,
    dispatch,
    widescreen,
    hideEditorArea,
  } = useContext(UIManagerContext);

  const updatePalette = useCallback(
    ({ type, initialQuery, metadata }) => {
      dispatch({
        type: 'UI/CHANGE_PALETTE_TYPE',
        value: { type: type, initialQuery, metadata },
      });
    },
    [dispatch],
  );

  usePaletteKeybindings({ updatePalette });

  const paletteItems = [
    useFilePalette(),
    useWorkspacePalette({ updatePalette }),
    useCommandPalette({ updatePalette }),
    useInputPalette({ metadata, updatePalette }),
  ];

  return (
    <PaletteUI
      paletteType={paletteType}
      updatePalette={updatePalette}
      paletteInitialQuery={paletteInitialQuery}
      parseRawQuery={parseRawQuery}
      generateRawQuery={generateRawQuery}
      paletteItems={paletteItems}
      className={`fadeInScaleAnimation bangle-palette ${
        widescreen ? 'widescreen' : ''
      }`}
    />
  );
}

function usePaletteKeybindings({ updatePalette }) {
  useKeybindings(() => {
    return {
      'Mod-P': () => {
        updatePalette({ type: COMMAND_PALETTE });
        return true;
      },

      'Mod-p': () => {
        updatePalette({ type: FILE_PALETTE });
        return true;
      },

      'Ctrl-r': () => {
        updatePalette({ type: WORKSPACE_PALETTE });
        return true;
      },
    };
  }, [updatePalette]);
}

const parseRawQuery = (currentType, rawQuery) => {
  // Some of the types depend on the current active query
  // for example if query starts with `>`, it becomes a command type
  // and if a user backspaces `>` it defaults to file.
  // but thats not true for all as `command/input/*` is static
  // and can only be dismissed.
  if (rawQuery.startsWith('>')) {
    return { paletteType: COMMAND_PALETTE, query: rawQuery.slice(1) };
  }

  if (rawQuery.startsWith('ws:')) {
    return { paletteType: WORKSPACE_PALETTE, query: rawQuery.slice(3) };
  }

  // Disallow changing of palette type
  if (currentType === INPUT_PALETTE) {
    return { paletteType: currentType, query: rawQuery };
  }

  return { paletteType: FILE_PALETTE, query: rawQuery };
};

const generateRawQuery = (paletteType, query) => {
  if (paletteType === COMMAND_PALETTE) {
    return '>' + query;
  }

  if (paletteType === WORKSPACE_PALETTE) {
    return 'ws:' + query;
  }

  if (paletteType === INPUT_PALETTE) {
    return query;
  }

  // defaults to file
  return query;
};
