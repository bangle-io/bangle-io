import React, { useRef, useState, useEffect } from 'react';

import {
  NullIcon,
  PaletteInfo,
  PaletteInfoItem,
  PaletteInput,
  PaletteItemsContainer,
  SidebarRow,
  SpinnerIcon,
  usePaletteProps,
} from 'ui-components/index';
import { useDestroyRef } from 'utils/hooks';
import { cx, sleep } from 'utils/utility';
import { PathValidationError } from 'workspace/index';
import { INPUT_PALETTE, PaletteTypeBase } from '../paletteTypes';

export class InputPalette extends PaletteTypeBase {
  static type = INPUT_PALETTE;
  static identifierPrefix = null;
  static description = 'Input';
  static UIComponent = InputPaletteUIComponent;
  static placeholder = '';
  static keybinding = null;
  // Donot parse any raw query
  static parseRawQuery(rawQuery) {
    return null;
  }
  static helpComponent = (
    <>
      <span className="font-semibold text-xs">
        <kbd>Enter</kbd> Confirm
      </span>
      <span className="font-semibold text-xs">
        <kbd>Escape</kbd> Cancel
      </span>
    </>
  );
}

function InputPaletteUIComponent({
  query,
  dismissPalette,
  updateQuery,
  rawInputValue,
  paletteInitialQuery,
  paletteMetadata,
  updatePalette,
}) {
  const destroyedRef = useDestroyRef();
  const [error, updateError] = useState();
  const [showSpinner, updateSpinner] = useState();
  useEffect(() => {
    updateError(undefined);
    updateSpinner(undefined);
  }, [query]);

  let resolvedItems;

  const onExecuteHOC = (selectedItem) => (item, itemIndex, event) => {
    event.preventDefault();
    if (destroyedRef.current) {
      return Promise.resolve();
    }
    let resolved = false;

    sleep(250).then(() => {
      if (!resolved) {
        updateSpinner(true);
      }
    });

    return Promise.resolve(paletteMetadata.onInputConfirm(selectedItem))
      .then((result) => {
        resolved = true;
        if (destroyedRef.current) {
          return;
        }
        updateSpinner(false);
        // prevent dismissing if result === false
        if (result === false) {
        } else {
          dismissPalette();
        }
      })
      .catch((err) => {
        if (destroyedRef.current) {
          return;
        }
        updateError(err);
        if (!(err instanceof PathValidationError)) {
          throw err;
        }
      });
  };

  if (paletteMetadata.availableOptions) {
    resolvedItems = paletteMetadata.availableOptions.map((option) => {
      if (!(option instanceof InputPaletteOption)) {
        throw new Error('Must be InputPaletteOption');
      }
      return {
        uid: option.uid,
        title: option.title,
        onExecute: onExecuteHOC(option.uid),
      };
    });
  } else {
    resolvedItems = [
      !error && {
        uid: 'input-confirm',
        title: 'Confirm',
        onExecute: onExecuteHOC(query),
      },
      error && {
        uid: 'input-clear',
        title: 'Clear input and retry',
        onExecute: (item, itemIndex, event) => {
          event.preventDefault();
          updateQuery(paletteInitialQuery || '');
        },
      },
    ].filter(Boolean);
  }

  resolvedItems.push({
    uid: 'input-cancel',
    title: 'Cancel',
    onExecute: (item, itemIndex, event) => {
      event.preventDefault();

      return Promise.resolve(paletteMetadata.onInputCancel?.(query))
        .then(() => {
          dismissPalette();
        })
        .catch((err) => {
          dismissPalette();
          throw err;
        });
    },
  });

  const { getItemProps, inputProps } = usePaletteProps({
    onDismiss: dismissPalette,
    resolvedItems,
    value: rawInputValue,
    updateValue: (rawQuery) => {
      updateQuery(rawQuery);
    },
  });

  return (
    <>
      <PaletteInput
        placeholder={paletteMetadata?.placeholder}
        ref={useRef()}
        className={cx(
          error && 'focus:outline-none focus:ring  focus:ring-red-600',
        )}
        paletteIcon={
          showSpinner ? (
            <span className="pr-2 flex items-center">
              <SpinnerIcon className="h-5 w-5" />
            </span>
          ) : (
            <span className="pr-2 flex items-center">
              <NullIcon className="h-5 w-5" />
            </span>
          )
        }
        {...inputProps}
      />
      {error && (
        <SidebarRow
          style={{ backgroundColor: 'var(--error-bg-color)' }}
          title={
            <div className="flex flex-col">
              <span>🤦‍♀️ there was en error</span>
              <span className="ml-3 text-sm">
                {error.displayMessage || error.message}
              </span>
            </div>
          }
        />
      )}
      <PaletteItemsContainer>
        {resolvedItems.map((item, i) => {
          return (
            <SidebarRow
              dataId={item.uid}
              className="palette-row"
              key={item.uid}
              title={item.title}
              rightHoverIcon={item.rightHoverIcon}
              rightIcon={
                <kbd className="whitespace-nowrap">{item.rightIcon}</kbd>
              }
              {...getItemProps(item, i)}
            />
          );
        })}
      </PaletteItemsContainer>
      <PaletteInfo>
        {showSpinner ? (
          <PaletteInfoItem>Processing, please wait...</PaletteInfoItem>
        ) : (
          <>
            {paletteMetadata?.paletteInfo && (
              <PaletteInfoItem>{paletteMetadata?.paletteInfo}</PaletteInfoItem>
            )}
            <PaletteInfoItem>use:</PaletteInfoItem>
            <PaletteInfoItem>
              <kbd className="font-normal">↑↓</kbd> to navigate
            </PaletteInfoItem>
            <PaletteInfoItem>
              <kbd className="font-normal">Esc</kbd> to cancel
            </PaletteInfoItem>
          </>
        )}
      </PaletteInfo>
    </>
  );
}

export class InputPaletteOption {
  constructor({ title, uid }) {
    this.title = title;
    this.uid = uid;
  }
}
