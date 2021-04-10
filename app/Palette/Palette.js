import React, { useContext, useCallback } from 'react';

import { UIManagerContext } from 'ui-context/index';

import { useKeybindings } from 'utils/index';
import { PaletteUI } from 'ui-components/index';
import { useCommandPalette } from './Palettes/CommandPalette';
import { useFilePalette } from './Palettes/FilePalette';
import { useInputPalette } from './Palettes/InputPalette';
import { useQuestionPalette } from './Palettes/QuestionPalette';
import { useHeadingPalette } from './Palettes/HeadingPalette';
import {
  COMMAND_PALETTE,
  FILE_PALETTE,
  INPUT_PALETTE,
  WORKSPACE_PALETTE,
  QUESTION_PALETTE,
  palettes,
  HEADING_PALETTE,
} from './paletteTypes';
import { useWorkspacePalette } from './Palettes/WorkspacePalette';

export function Palette() {
  const {
    paletteMetadata: metadata,
    paletteType,
    paletteInitialQuery,
    dispatch,
    widescreen,
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
    useFilePalette({ paletteType, updatePalette }),
    useWorkspacePalette({ updatePalette }),
    useCommandPalette({ updatePalette }),
    useInputPalette({ metadata, updatePalette }),
    useQuestionPalette({ updatePalette }),
    useHeadingPalette({ updatePalette }),
  ];

  return (
    <PaletteUI
      placeholder={palettes[paletteType]?.inputPlaceholder}
      paletteTypeIcon={getPaletteIcon(paletteType)}
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

  if (rawQuery.startsWith('?')) {
    return { paletteType: QUESTION_PALETTE, query: rawQuery.slice(1) };
  }

  if (rawQuery.startsWith('#')) {
    return { paletteType: HEADING_PALETTE, query: rawQuery.slice(1) };
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

  if (paletteType === QUESTION_PALETTE) {
    return '?' + query;
  }

  if (paletteType === HEADING_PALETTE) {
    return '#' + query;
  }

  if (paletteType === INPUT_PALETTE) {
    return query;
  }

  // defaults to file
  return query;
};

function getPaletteIcon(paletteType) {
  let Icon = palettes[paletteType]?.Icon;

  return (
    Icon && (
      <span className="pr-2 flex items-center">
        <Icon className="h-5 w-5 " />
      </span>
    )
  );
}

function usePaletteKeybindings({ updatePalette }) {
  useKeybindings(() => {
    return Object.fromEntries(
      Object.values(palettes)
        .filter((r) => r.keybinding)
        .map((r) => [
          r.keybinding,
          () => {
            updatePalette({ type: r.type });
            return true;
          },
        ]),
    );
  }, [updatePalette]);
}
