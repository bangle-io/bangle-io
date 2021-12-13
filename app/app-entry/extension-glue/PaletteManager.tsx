import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useActionContext } from '@bangle.io/action-context';
import type {
  PaletteManagerImperativeHandle,
  PaletteManagerReactComponentProps,
} from '@bangle.io/extension-registry';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { UniversalPalette } from '@bangle.io/ui-components';
import { PaletteOnExecuteItem } from '@bangle.io/ui-components/UniversalPalette/hooks';
import { useUIManagerContext } from '@bangle.io/ui-context';

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
  const { dispatchAction } = useActionContext();
  const extensionRegistry = useExtensionRegistryContext();

  const dismissPalette = useCallback(
    (focusEditor = true) => {
      updateQuery('');
      dispatch({
        name: 'UI/RESET_PALETTE',
      });
      if (focusEditor) {
        dispatchAction({
          name: 'action::editor-manager-context:focus-primary-editor',
        });
      }
    },
    [dispatch, dispatchAction],
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
        name: 'UI/UPDATE_PALETTE',
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
      const match = extensionRegistry.paletteParseRawQuery(rawQuery);

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
    [
      resetCounter,
      dismissPalette,
      extensionRegistry,
      paletteType,
      updatePalette,
      updateQuery,
    ],
  );

  const Palette = paletteType
    ? extensionRegistry.getPalette(paletteType)
    : undefined;

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
      widescreen={widescreen}
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
      />
    </UniversalPalette.PaletteContainer>
  );
}
