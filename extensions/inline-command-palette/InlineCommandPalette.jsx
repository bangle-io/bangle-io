import React, { useMemo } from 'react';
import reactDOM from 'react-dom';
import {
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from 'inline-palette/index';
import { palettePluginKey } from './config';
import { useDateItems } from './use-date-items';
import { useEditorItems } from './use-editor-items';
import {
  PaletteItem,
  PALETTE_ITEM_HINT_TYPE,
  PALETTE_ITEM_REGULAR_TYPE,
} from './palette-item';
import { PaletteInfo, PaletteInfoItem } from 'ui-components';
import { InlinePaletteRow } from 'ui-components/InlinePaletteUI/InlinePaletteUI';

export function InlineCommandPalette() {
  const { query, counter } = useInlinePaletteQuery(palettePluginKey);

  const timestampItems = useDateItems(query);
  const editorItems = useEditorItems(query);
  const [items, hintItems] = useMemo(() => {
    let items = [...timestampItems, ...editorItems];
    if (!items.every((item) => item instanceof PaletteItem)) {
      throw new Error(
        `uid: "${
          items.find((item) => !(item instanceof PaletteItem))?.uid
        }" must be an instance of PaletteItem `,
      );
    }
    let hintItems = items.filter(
      (item) => item.type === PALETTE_ITEM_HINT_TYPE,
    );

    items = [...timestampItems, ...editorItems]
      .filter(
        (item) =>
          queryMatch(item, query) && item.type === PALETTE_ITEM_REGULAR_TYPE,
      )
      .sort((a, b) => {
        if (a.highPriority) {
          return 1;
        }
        if (b.highPriority) {
          return 1;
        }

        if (a.disabled) {
          return -1;
        }
        if (b.disabled) {
          return -1;
        }

        if (a.group === b.group) {
          return a.title.localeCompare(b.title);
        }
        return a.group.localeCompare(b.group);
      });

    return [items, hintItems];
  }, [query, editorItems, timestampItems]);

  const { tooltipContentDOM, getItemProps } = useInlinePaletteItems(
    palettePluginKey,
    items,
    counter,
  );

  return reactDOM.createPortal(
    <div className="inline-palette-wrapper shadow-2xl">
      <div className="inline-palette-items-wrapper">
        {items.map((item, i) => {
          return (
            <InlinePaletteRow
              key={item.uid}
              dataId={item.uid}
              disabled={item.disabled}
              title={item.title}
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
      <PaletteInfo>
        <PaletteInfoItem>
          <kbd className="font-normal">↑↓</kbd> Navigate
        </PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">Enter</kbd> Execute a command
        </PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">Esc</kbd> Dismiss
        </PaletteInfoItem>
      </PaletteInfo>
    </div>,
    tooltipContentDOM,
  );
}

function queryMatch(command, query) {
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

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
