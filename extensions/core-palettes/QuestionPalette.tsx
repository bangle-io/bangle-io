import React, { useCallback, useImperativeHandle } from 'react';

import {
  ExtensionPaletteType,
  useExtensionRegistryContext,
} from '@bangle.io/extension-registry';
import { NullIcon, UniversalPalette } from '@bangle.io/ui-components';

import { extensionName } from './config';

const identifierPrefix = '?';

const QuestionPaletteUIComponent: ExtensionPaletteType['ReactComponent'] =
  React.forwardRef(
    ({ query, updatePalette, onSelect, getActivePaletteItem }, ref) => {
      const extensionRegistry = useExtensionRegistryContext();

      const items = extensionRegistry
        .getAllPalettes()
        .map((r) => {
          return {
            uid: r.type,
            rightNode: <kbd>{r.identifierPrefix}</kbd>,
            rightHoverNode: <kbd>{r.identifierPrefix}</kbd>,
            title: r.type.split('/').slice(1).join('/'),
            data: {
              type: r.type,
            },
          };
        })
        .filter((obj) => strMatch(obj.title, query));

      const onExecuteItem = useCallback(
        (getUid, sourceInfo) => {
          const uid = getUid(items);
          const item = items.find((item) => item.uid === uid);
          if (item) {
            updatePalette(item.data.type);
          }
        },
        [updatePalette, items],
      );

      // Expose onExecuteItem for the parent to call it
      // If we dont do this clicking or entering will not work
      useImperativeHandle(
        ref,
        () => ({
          onExecuteItem,
        }),
        [onExecuteItem],
      );

      const activeItem = getActivePaletteItem(items);

      return (
        <>
          <UniversalPalette.PaletteItemsContainer>
            {items.map((item) => {
              return (
                <UniversalPalette.PaletteItemUI
                  key={item.uid}
                  item={item}
                  isActive={activeItem === item}
                  onClick={onSelect}
                />
              );
            })}
          </UniversalPalette.PaletteItemsContainer>
          <UniversalPalette.PaletteInfo>
            <UniversalPalette.PaletteInfoItem>
              use:
            </UniversalPalette.PaletteInfoItem>
            <UniversalPalette.PaletteInfoItem>
              <kbd className="font-normal">↑↓</kbd> Navigate
            </UniversalPalette.PaletteInfoItem>
            <UniversalPalette.PaletteInfoItem>
              <kbd className="font-normal">Enter</kbd> Select a Palette
            </UniversalPalette.PaletteInfoItem>
          </UniversalPalette.PaletteInfo>
        </>
      );
    },
  );

export const questionPalette: ExtensionPaletteType = {
  type: extensionName + '/question',
  icon: <NullIcon />,
  identifierPrefix,
  placeholder: 'Available palettes',
  parseRawQuery: (rawQuery) => {
    if (identifierPrefix && rawQuery.startsWith(identifierPrefix)) {
      return rawQuery.slice(1);
    }
    return null;
  },
  ReactComponent: QuestionPaletteUIComponent,
};

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
