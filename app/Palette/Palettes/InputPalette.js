import React, { useRef } from 'react';

import {
  NullIcon,
  PaletteInput,
  PaletteItemsContainer,
  SidebarRow,
  usePaletteProps,
} from 'ui-components';
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
}

const ActivePalette = InputPalette;

function InputPaletteUIComponent({
  query,
  dismissPalette,
  updateQuery,
  rawInputValue,
  paletteMetadata,
}) {
  const resolvedItems = [
    {
      uid: 'input-confirm',
      title: 'Confirm',
      onExecute: (item, itemIndex, event) => {
        event.preventDefault();
        return Promise.resolve(paletteMetadata.onInputConfirm(query))
          .then(() => {
            dismissPalette();
          })
          .catch((err) => {
            console.error(err);
          });
      },
    },
    {
      uid: 'input-cancel',
      title: 'Cancel',
      onExecute: (item, itemIndex, event) => {
        event.preventDefault();

        return Promise.resolve(paletteMetadata.onInputCancel?.(query))
          .then(() => {
            dismissPalette();
          })
          .catch((err) => {
            console.error(err);
            dismissPalette();
          });
      },
    },
  ];

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
        paletteIcon={
          <span className="pr-2 flex items-center">
            <NullIcon className="h-5 w-5" />
          </span>
        }
        {...inputProps}
      />
      <PaletteItemsContainer>
        {resolvedItems.map((item, i) => {
          return (
            <SidebarRow
              dataId={item.uid}
              className="palette-row"
              disabled={item.disabled}
              key={item.uid}
              title={item.title}
              rightHoverIcon={item.rightHoverIcon}
              rightIcon={
                <kbd className="whitespace-nowrap">{item.keybinding}</kbd>
              }
              {...getItemProps(item, i)}
            />
          );
        })}
      </PaletteItemsContainer>
    </>
  );
}
