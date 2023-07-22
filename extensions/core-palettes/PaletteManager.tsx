import React, { useCallback, useEffect, useRef, useState } from 'react';

import { nsmApi2 } from '@bangle.io/api';
import type { PaletteOnExecuteItem } from '@bangle.io/ui-components';
import { UniversalPalette } from '@bangle.io/ui-components';
import { safeRequestAnimationFrame } from '@bangle.io/utils';

import type {
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
  const { paletteMetadata, paletteType, paletteInitialQuery } =
    nsmApi2.ui.useUi();

  const inputRef = useRef<HTMLInputElement>(null);
  const [query, updateQuery] = useState(paletteInitialQuery || '');

  const dismissPalette = useCallback((focus = true) => {
    updateQuery('');
    nsmApi2.ui.resetPalette();

    if (focus) {
      safeRequestAnimationFrame(() => {
        nsmApi2.editor.focusEditorIfNotFocused();
      });
    }
  }, []);

  const paletteRef = useRef<PaletteManagerImperativeHandle>(null);

  const onExecuteItem = useCallback<PaletteOnExecuteItem>(
    (items, info) => {
      const maybeAsyncResult = paletteRef.current?.onExecuteItem(items, info);

      Promise.resolve(maybeAsyncResult).then((result) => {
        dismissPalette(!result?.shouldPreventFocus);
      });

      return maybeAsyncResult;
    },
    [dismissPalette],
  );

  const updatePalette = useCallback<
    PaletteManagerReactComponentProps['updatePalette']
  >((type, initialQuery = '') => {
    nsmApi2.ui.updatePalette(type, initialQuery);

    if (type) {
      document
        .querySelector<HTMLInputElement>(
          '.B-ui-components_universal-palette-container input',
        )
        ?.focus();
    }
  }, []);

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
          .querySelector<HTMLInputElement>(
            '.B-ui-components_universal-palette-container input',
          )
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
