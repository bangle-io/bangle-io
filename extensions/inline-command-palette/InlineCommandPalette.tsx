import React, { useCallback, useEffect, useState } from 'react';
import reactDOM from 'react-dom';

import type { EditorView } from '@bangle.dev/pm';
import { useEditorViewContext } from '@bangle.dev/react';

import {
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from '@bangle.io/inline-palette';
import { InlinePaletteRow, UniversalPalette } from '@bangle.io/ui-components';

import { palettePluginKey } from './config';
import {
  PALETTE_ITEM_HINT_TYPE,
  PALETTE_ITEM_REGULAR_TYPE,
  PaletteItem,
} from './palette-item';
import { useDateItems } from './use-date-items';
import { useEditorItems } from './use-editor-items';

const staticHints = [
  PaletteItem.create({
    uid: 'useBacklink',
    type: PALETTE_ITEM_HINT_TYPE,
    title: 'Linking a note',
    description: `Type [[ and then name of the note to create a link to it`,
    keywords: ['backlink', 'link'],
    group: 'hints',
    disabled: true,
    // TODO clicking this hint to switch to backlink suggest
    editorExecuteCommand: () => {
      // return replaceSuggestionMarkWith(palettePluginKey, getDate(type));
    },
  }),
];
function getItemsAndHints(
  view: EditorView,
  query: string,
  editorItems: PaletteItem[],
  timestampItems: PaletteItem[],
  isItemDisabled: (item: PaletteItem) => boolean,
) {
  let items = [...timestampItems, ...editorItems];

  if (!items.every((item) => item instanceof PaletteItem)) {
    throw new Error(
      `uid: "${
        items.find((item) => !(item instanceof PaletteItem))?.uid
      }" must be an instance of PaletteItem `,
    );
  }

  items = items.filter((item) =>
    typeof item.hidden === 'function' ? !item.hidden(view.state) : !item.hidden,
  );

  // TODO This is hacky
  items.forEach((item) => {
    (item as any)._isItemDisabled = isItemDisabled(item);
  });

  let hintItems = [
    ...staticHints,
    ...items.filter((item) => item.type === PALETTE_ITEM_HINT_TYPE),
  ];

  items = items
    .filter(
      (item) =>
        queryMatch(item, query) && item.type === PALETTE_ITEM_REGULAR_TYPE,
    )
    .sort((a, b) => {
      let result = fieldExistenceSort(a, b, 'highPriority');

      if (result !== 0) {
        return result;
      }

      result = fieldExistenceSort(a, b, '_isItemDisabled', true);

      if (result !== 0) {
        return result;
      }

      if (a.group === b.group) {
        return a.title.localeCompare(b.title);
      }

      return a.group.localeCompare(b.group);
    });

  return { items, hintItems };
}

export function InlineCommandPalette() {
  const { query, counter, isVisible, tooltipContentDOM } =
    useInlinePaletteQuery(palettePluginKey);
  const view = useEditorViewContext();

  const timestampItems = useDateItems(query);
  const editorItems = useEditorItems();
  const isItemDisabled = useCallback(
    (item) => {
      return typeof item.disabled === 'function'
        ? item.disabled(view.state)
        : item.disabled;
    },
    [view],
  );

  const [{ items, hintItems }, updateItem] = useState(() => {
    return getItemsAndHints(
      view,
      query,
      editorItems,
      timestampItems,
      isItemDisabled,
    );
  });

  useEffect(() => {
    const payload = getItemsAndHints(
      view,
      query,
      editorItems,
      timestampItems,
      isItemDisabled,
    );
    updateItem(payload);
  }, [
    view,
    query,
    editorItems,
    timestampItems,
    isItemDisabled,
    // so that we recompute things, especially disabled, is palette visibility changes
    isVisible,
  ]);

  const { getItemProps } = useInlinePaletteItems(
    palettePluginKey,
    items,
    counter,
    isItemDisabled,
  );

  return reactDOM.createPortal(
    <div className="B-ui-components_inline-palette-wrapper flex flex-col bg-colorNeutralBgLayerFloat shadow-2xl">
      <div className="B-ui-components_inline-palette-items-wrapper">
        {items.map((item, i) => {
          return (
            <InlinePaletteRow
              key={item.uid}
              dataId={item.uid}
              disabled={(item as any)._isItemDisabled}
              title={((item as any)._isItemDisabled ? '🚫 ' : '') + item.title}
              description={item.description}
              rightHoverIcon={item.rightHoverIcon}
              rightIcon={
                <kbd className="whitespace-nowrap">{item.keybinding}</kbd>
              }
              {...getItemProps(item, i)}
            />
          );
        })}

        {hintItems.map((item, i) => {
          return (
            <InlinePaletteRow
              key={item.uid}
              dataId={item.uid}
              className="palette-row"
              title={'💡 Tip ' + item.title}
              description={item.description}
              rightHoverIcon={item.rightHoverIcon}
              rightIcon={
                <kbd className="whitespace-nowrap">{item.keybinding}</kbd>
              }
            />
          );
        })}
      </div>
      <UniversalPalette.PaletteInfo>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">↑↓</kbd> Navigate
        </UniversalPalette.PaletteInfoItem>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">Enter</kbd> Execute a command
        </UniversalPalette.PaletteInfoItem>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">Esc</kbd> Dismiss
        </UniversalPalette.PaletteInfoItem>
      </UniversalPalette.PaletteInfo>
    </div>,
    tooltipContentDOM,
  );
}

function queryMatch<
  T extends {
    skipFiltering: boolean;
    title: string;
    keywords?: string[] | string;
    description: string;
    group: string;
  },
>(command: T, query: string) {
  if (command.skipFiltering) {
    return command;
  }

  if (strMatch(command.title, query)) {
    return command;
  }

  if (command.keywords && strMatch(command.keywords, query)) {
    return command;
  }

  if (strMatch(command.group, query)) {
    return command;
  }

  if (strMatch(command.description, query)) {
    return command;
  }

  return undefined;
}

function strMatch(a: string[] | string, b: string): boolean {
  b = b.toLocaleLowerCase();

  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();

  return a.includes(b) || b.includes(a);
}

// returning -1 means keep order [a, b]
// returning 1 means reverse order ie [b, a]
function fieldExistenceSort(
  a: { [key: string]: any },
  b: { [key: string]: any },
  field: string,
  reverse = false,
) {
  if (a[field] && !b[field]) {
    return reverse ? 1 : -1;
  }

  if (b[field] && !a[field]) {
    return reverse ? -1 : 1;
  }

  return 0;
}
