import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  focusEditor,
  useEditorManagerContext,
} from '@bangle.io/slice-editor-manager';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import {
  PaletteOnExecuteItem,
  UniversalPalette,
} from '@bangle.io/ui-components';
import { safeRequestAnimationFrame } from '@bangle.io/utils';

import {
  PaletteManagerImperativeHandle,
  PaletteManagerReactComponentProps,
} from './config';
import { headingPalette } from './HeadingPalette';
import { notesPalette } from './NotesPalette';
import { operationPalette } from './OperationPalette';
import { questionPalette } from './QuestionPalette';
import { workspacePalette } from './WorkspacePalette';

const palettes = [
  headingPalette,
  workspacePalette,
  questionPalette,
  operationPalette,
  // // should always be the last palette
  // // TODO: add constraints to make sure it always is
  notesPalette,
];

const paletteByType = Object.fromEntries(
  palettes.map((obj) => [obj.type, obj]),
);

export function PaletteManager() {
  const {
    paletteMetadata,
    paletteType,
    paletteInitialQuery,
    dispatch,
    widescreen,
  } = useUIManagerContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, updateQuery] = useState(paletteInitialQuery || '');
  const { bangleStore } = useEditorManagerContext();

  const dismissPalette = useCallback(
    (focus = true) => {
      updateQuery('');
      dispatch({
        name: 'action::@bangle.io/slice-ui:RESET_PALETTE',
      });

      if (focus) {
        safeRequestAnimationFrame(() => {
          focusEditor()(bangleStore.state);
        });
      }
    },
    [dispatch, bangleStore],
  );

  const paletteRef = useRef<PaletteManagerImperativeHandle>(null);

  const onExecuteItem = useCallback<PaletteOnExecuteItem>(
    (items, info) => {
      dismissPalette();
      paletteRef.current?.onExecuteItem(items, info);
    },
    [dismissPalette],
  );

  const updatePalette = useCallback<
    PaletteManagerReactComponentProps['updatePalette']
  >(
    (type, initialQuery = '') => {
      dispatch({
        name: 'action::@bangle.io/slice-ui:UPDATE_PALETTE',
        value: { type, initialQuery },
      });

      if (type) {
        document
          .querySelector<HTMLInputElement>('.universal-palette-container input')
          ?.focus();
      }
    },
    [dispatch],
  );

  const { inputProps, updateCounter, resetCounter, counter, onSelect } =
    UniversalPalette.usePaletteDriver(dismissPalette, onExecuteItem);

  useEffect(() => {
    resetCounter();
  }, [query, resetCounter]);

  // reset query if palette type changes
  useEffect(() => {
    updateQuery(paletteInitialQuery || '');
    resetCounter();
  }, [resetCounter, paletteType, paletteInitialQuery]);

  // deriving the final input value helps us avoid keeping two states (paletteType, rawQuery) in sync.
  // with this there is always a a single state paletteType + query , where raw query is derived from it.
  // Note: that we are passing this callback to the children and they are free to override it.
  const updateRawInputValue = useCallback(
    (rawQuery) => {
      const match = palettes.find(
        (palette) => palette.parseRawQuery(rawQuery) != null,
      );

      resetCounter();

      if (!match) {
        dismissPalette();

        return;
      }

      const query = match.parseRawQuery(rawQuery);

      // if some other palette parses this query, switch to it
      if (match.type !== paletteType) {
        updatePalette(match.type, query || '');
      } else {
        updateQuery(query || '');
      }
    },
    [resetCounter, dismissPalette, paletteType, updatePalette, updateQuery],
  );

  const Palette = paletteType ? paletteByType[paletteType] : undefined;

  const getActivePaletteItem = useCallback(
    (items) => {
      return items[UniversalPalette.getActiveIndex(counter, items.length)];
    },
    [counter],
  );

  if (!Palette) {
    return null;
  }

  return (
    <UniversalPalette.PaletteContainer
      paletteType={paletteType}
      widescreen={false}
      onClickOutside={dismissPalette}
      onClickInside={() => {
        document
          .querySelector<HTMLInputElement>('.universal-palette-container input')
          ?.focus();
      }}
    >
      <UniversalPalette.PaletteInput
        leftNode={Palette.icon}
        placeholder={Palette.placeholder}
        inputValue={Palette.identifierPrefix + query}
        onInputValueChange={updateRawInputValue}
        ref={inputRef}
        {...inputProps}
      />
      <Palette.ReactComponent
        ref={paletteRef}
        query={query}
        paletteType={paletteType}
        paletteMetadata={paletteMetadata}
        updatePalette={updatePalette}
        dismissPalette={dismissPalette}
        onSelect={onSelect}
        counter={counter}
        getActivePaletteItem={getActivePaletteItem}
        updateCounter={updateCounter}
        allPalettes={palettes}
      />
    </UniversalPalette.PaletteContainer>
  );
}
