import React from 'react';

import { NullIcon, PaletteUI } from 'ui-components';
import { INPUT_PALETTE, PaletteTypeBase } from '../paletteTypes';

export class InputPalette extends PaletteTypeBase {
  static type = INPUT_PALETTE;
  static identifierPrefix = null;
  static description = 'Input';
  static PaletteIcon = NullIcon;
  static UIComponent = InputPaletteUIComponent;
  static placeholder = '';
  static keybinding = null;
  // Donot parse any raw query
  static parseRawQuery(rawQuery) {
    return null;
  }
}

function InputPaletteUIComponent({
  paletteMetadata,
  dismissPalette,
  query,
  paletteProps,
  updateQuery,
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

  paletteProps = {
    ...paletteProps,
    value: query,
    updateValue: (rawQuery) => {
      updateQuery(rawQuery);
    },
  };

  return <PaletteUI items={resolvedItems} {...paletteProps} />;
}
