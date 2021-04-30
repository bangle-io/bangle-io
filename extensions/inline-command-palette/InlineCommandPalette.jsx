import React, { useMemo } from 'react';
import reactDOM from 'react-dom';
import {
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from 'inline-palette/index';
import { palettePluginKey } from './config';
import { useDateItems } from './use-date-items';
import { ItemRow } from './ItemRow';
import { useEditorItems } from './use-editor-items';

export function InlineCommandPalette() {
  const { query, counter } = useInlinePaletteQuery(palettePluginKey);

  const timestampItems = useDateItems(query);
  const editorItems = useEditorItems(query);
  const items = useMemo(() => {
    return [...timestampItems, ...editorItems]
      .filter((item) => queryMatch(item, query))
      .sort((a, b) => {
        if (a.show) {
          return 1;
        }
        if (b.show) {
          return 1;
        }
        if (a.disabled) {
          return -1;
        }
        if (b.disabled) {
          return -1;
        }

        return a.title.localeCompare(b.title);
      });
  }, [query, editorItems, timestampItems]);

  const { tooltipContentDOM, getItemProps } = useInlinePaletteItems(
    palettePluginKey,
    items,
    counter,
  );

  return reactDOM.createPortal(
    <div className="bangle-emoji-suggest">
      {items.map((item, i) => {
        return (
          <ItemRow
            key={item.uid}
            dataId={item.uid}
            className="palette-row"
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
    </div>,
    tooltipContentDOM,
  );
}

function queryMatch(command, query) {
  if (command.show) {
    return command;
  }

  if (strMatch(command.title, query)) {
    return command;
  }

  if (command.keywords && strMatch(command.keywords, query)) {
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
