import React, {
  useContext,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import { Selection } from '@bangle.dev/core/prosemirror/state';
import { useWorkspacePath } from 'workspace/index';
import {
  MagicPaletteItem,
  MagicPaletteItemsContainer,
} from 'magic-palette/index';
import { PaletteInfo, PaletteInfoItem, NullIcon } from 'ui-components';
import { extensionName } from './config';
import { EditorManagerContext } from 'editor-manager-context/index';

const identifierPrefix = '?';
export const questionPalette = {
  type: extensionName + '/question',
  icon: (
    <span className="pr-2 flex items-center">
      <NullIcon className="h-5 w-5" />
    </span>
  ),
  identifierPrefix,
  placeholder: 'Available palettes',
  parseRawQuery: (rawQuery) => {
    if (identifierPrefix && rawQuery.startsWith(identifierPrefix)) {
      return rawQuery.slice(1);
    }
    return null;
  },
  ReactComponent: React.forwardRef(QuestionPaletteUIComponent),
};

function QuestionPaletteUIComponent(
  { query, updatePalette, dismissPalette, paletteItemProps },
  ref,
) {
  const { bangleIOContext } = useContext(EditorManagerContext);

  const items2 = bangleIOContext.getAllPalettes();
  const items = items2.map((r) => {
    return {
      uid: r.type,
      rightIcons: <kbd>{r.identifierPrefix}</kbd>,
      rightHoverIcons: <kbd>{r.identifierPrefix}</kbd>,
      title: r.type.split('/').slice(1).join('/'),
      data: {
        type: r.type,
      },
    };
  });
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
              rightIcons={item.rightIcons}
              rightHoverIcons={item.rightHoverIcons}
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
          <kbd className="font-normal">Enter</kbd> Select a Palette
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
