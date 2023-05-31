import React, { useCallback, useImperativeHandle, useMemo } from 'react';

import { Selection } from '@bangle.dev/pm';

import { nsmApi2 } from '@bangle.io/api';
import { CorePalette } from '@bangle.io/constants';
import type { PaletteOnExecuteItem } from '@bangle.io/ui-components';
import { NullIcon, UniversalPalette } from '@bangle.io/ui-components';
import { safeRequestAnimationFrame } from '@bangle.io/utils';

import type { ExtensionPaletteType } from './config';

const identifierPrefix = '#';

const HeadingPalette: ExtensionPaletteType['ReactComponent'] = React.forwardRef(
  ({ query, onSelect, getActivePaletteItem }, ref) => {
    const items = useMemo(() => {
      const { primaryEditor } = nsmApi2.editor.editorState();

      if (!primaryEditor || primaryEditor.destroyed) {
        return [];
      }

      const headingNodes: Array<{
        offset: number;
        level: number;
        title: string;
      }> = [];

      primaryEditor.view.state.doc.forEach((node, offset) => {
        if (node.type.name === 'heading') {
          headingNodes.push({
            offset,
            level: node.attrs.level,
            title: node.textContent,
          });
        }
      });

      return headingNodes
        .filter((r) => {
          if (
            query.length === 1 &&
            parseInt(query) <= 6 &&
            parseInt(query) > 0
          ) {
            return r.level === parseInt(query);
          }

          return strMatch(r.title + ' ' + r.level, query);
        })
        .map((r, i) => {
          return {
            uid: i + 'heading',
            title: r.title,
            extraInfo: '#' + r.level,
            data: r,
          };
        });
    }, [query]);

    const onExecuteItem = useCallback<PaletteOnExecuteItem>(
      (getUid, sourceInfo) => {
        const { primaryEditor } = nsmApi2.editor.editorState();

        const uid = getUid(items);
        const item = items.find((item) => item.uid === uid);

        if (item) {
          // Using this to wait for editor to get focused
          safeRequestAnimationFrame(() => {
            if (!primaryEditor || primaryEditor.destroyed) {
              return;
            }
            primaryEditor.focusView();
            const { dispatch, state } = primaryEditor.view;
            const tr = state.tr;
            dispatch(
              tr
                .setSelection(Selection.near(tr.doc.resolve(item.data.offset)))
                .scrollIntoView(),
            );
          });
        }
      },
      [items],
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
                onClick={onSelect}
                isActive={activeItem === item}
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
            <kbd className="font-normal">Enter</kbd> Jump to a heading
          </UniversalPalette.PaletteInfoItem>
        </UniversalPalette.PaletteInfo>
      </>
    );
  },
);

function strMatch(a: string[] | string, b: string): boolean {
  b = b.toLocaleLowerCase();

  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();

  return a.includes(b) || b.includes(a);
}

export const headingPalette: ExtensionPaletteType = {
  type: CorePalette.Heading,
  icon: <NullIcon />,
  identifierPrefix,
  placeholder: 'Jump to a heading.',
  parseRawQuery: (rawQuery) => {
    if (identifierPrefix && rawQuery.startsWith(identifierPrefix)) {
      return rawQuery.slice(1);
    }

    return null;
  },
  ReactComponent: HeadingPalette,
};
