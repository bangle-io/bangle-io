import React, { useMemo } from 'react';
import reactDOM from 'react-dom';
import {
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from 'inline-palette/index';
import {
  PaletteInfo,
  PaletteInfoItem,
  InlinePaletteRow,
} from 'ui-components/index';
import { replaceSuggestionMarkWith } from 'inline-palette/inline-palette';
import { resolvePath, useListCachedNoteWsPaths } from 'workspace/index';
import { backLinkNodeName, palettePluginKey } from './config';

export function InlineBacklinkPalette() {
  const { query, counter } = useInlinePaletteQuery(palettePluginKey);
  const [currentFiles = []] = useListCachedNoteWsPaths();

  const items = useMemo(() => {
    if (!query) {
      return [];
    }

    const items = currentFiles.map((wsPath) => {
      return {
        uid: wsPath,
        title: resolvePath(wsPath).filePath,
        editorExecuteCommand: ({ item }) => {
          return (state, dispatch, view) => {
            let nodeType = state.schema.nodes[backLinkNodeName];
            return replaceSuggestionMarkWith(
              palettePluginKey,
              nodeType.create({
                path: resolvePath(wsPath).filePath,
              }),
            )(state, dispatch, view);
          };
        },
      };
    });
    return items.filter((item) => queryMatch(item, query)).slice(0, 50);
  }, [query, currentFiles]);

  const { tooltipContentDOM, getItemProps } = useInlinePaletteItems(
    palettePluginKey,
    items,
    counter,
    () => false,
  );

  return reactDOM.createPortal(
    <div className="inline-palette-wrapper shadow-2xl">
      <div className="inline-palette-items-wrapper">
        {query === '' && (
          <InlinePaletteRow
            dataId="searchNote"
            className="palette-row"
            title={'💡 Search for a note to link it'}
          />
        )}
        {items.map((item, i) => {
          return (
            <InlinePaletteRow
              key={item.uid}
              dataId={item.uid}
              className="palette-row"
              // TODO this is hacky
              description={item.title}
              rightHoverIcon={item.rightHoverIcon}
              rightIcon={
                <kbd className="whitespace-nowrap">{item.keybinding}</kbd>
              }
              {...getItemProps(item, i)}
            />
          );
        })}
        <PaletteInfo>
          <PaletteInfoItem>
            <kbd className="font-normal">↑↓</kbd> Navigate
          </PaletteInfoItem>
          <PaletteInfoItem>
            <kbd className="font-normal">Enter</kbd> Create link
          </PaletteInfoItem>
          <PaletteInfoItem>
            <kbd className="font-normal">Esc</kbd> Dismiss
          </PaletteInfoItem>
        </PaletteInfo>
      </div>
    </div>,
    tooltipContentDOM,
  );
}

function queryMatch(item, query) {
  const keywords = item.keywords || '';

  if (keywords.length > 0) {
    if (strMatch(keywords.split(','), query)) {
      return item;
    }
  }
  return strMatch(item.title, query) ? item : undefined;
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
