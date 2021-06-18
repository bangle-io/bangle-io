import React, {
  useContext,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import { Selection } from '@bangle.dev/core/prosemirror/state';
import {
  MagicPaletteItem,
  MagicPaletteItemsContainer,
} from 'magic-palette/index';
import { PaletteInfo, PaletteInfoItem, NullIcon } from 'ui-components';
import { extensionName } from './config';
import { EditorManagerContext } from 'editor-manager-context/index';

const identifierPrefix = '#';
export const headingPalette = {
  type: extensionName + '/heading',
  icon: (
    <span className="pr-2 flex items-center">
      <NullIcon className="h-5 w-5" />
    </span>
  ),
  identifierPrefix,
  placeholder: 'Jump to a heading.',
  parseRawQuery: (rawQuery) => {
    if (identifierPrefix && rawQuery.startsWith(identifierPrefix)) {
      return rawQuery.slice(1);
    }
    return null;
  },
  ReactComponent: React.forwardRef(HeadingPalette),
};

function HeadingPalette({ query, paletteItemProps }, ref) {
  const { primaryEditor } = useContext(EditorManagerContext);

  const items = useMemo(() => {
    if (!primaryEditor || primaryEditor.destroyed) {
      return [];
    }

    const headingNodes = [];
    primaryEditor.view.state.doc.forEach((node, offset, i) => {
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
        if (query.length === 1 && parseInt(query) <= 6 && parseInt(query) > 0) {
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
  }, [query, primaryEditor]);

  const onExecuteItem = useCallback(
    (getUid, sourceInfo) => {
      const uid = getUid(items);
      const item = items.find((item) => item.uid === uid);
      if (item) {
        // Using this to wait for editor to get focused
        requestAnimationFrame(() => {
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
    [primaryEditor, items],
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

  return (
    <>
      <MagicPaletteItemsContainer>
        {items.map((item) => {
          return (
            <MagicPaletteItem
              key={item.uid}
              items={items}
              title={item.title}
              extraInfo={item.extraInfo}
              showDividerAbove={item.showDividerAbove}
              uid={item.uid}
              isDisabled={item.disabled}
              {...paletteItemProps}
            />
          );
        })}
      </MagicPaletteItemsContainer>
      <PaletteInfo>
        <PaletteInfoItem>use:</PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">↑↓</kbd> Navigate
        </PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">Enter</kbd> Jump to a heading
        </PaletteInfoItem>
      </PaletteInfo>
    </>
  );
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
