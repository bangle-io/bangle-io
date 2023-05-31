import React, { useCallback, useImperativeHandle } from 'react';

import { CorePalette } from '@bangle.io/constants';
import type { PaletteOnExecuteItem } from '@bangle.io/ui-components';
import { NullIcon, UniversalPalette } from '@bangle.io/ui-components';

import type { ExtensionPaletteType } from './config';

const identifierPrefix = '?';

const QuestionPaletteUIComponent: ExtensionPaletteType['ReactComponent'] =
  React.forwardRef(
    (
      { query, updatePalette, onSelect, getActivePaletteItem, allPalettes },
      ref,
    ) => {
      const items = allPalettes
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

      const onExecuteItem = useCallback<PaletteOnExecuteItem>(
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
  type: CorePalette.Question,
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

function strMatch(a: string[] | string, b: string): boolean {
  b = b.toLocaleLowerCase();

  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();

  return a.includes(b) || b.includes(a);
}
