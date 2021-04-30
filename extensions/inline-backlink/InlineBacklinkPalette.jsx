import React, { useMemo } from 'react';
import reactDOM from 'react-dom';
import {
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from 'inline-palette/index';
import { SidebarRow } from 'ui-components';
import { replaceSuggestionMarkWith } from 'inline-palette/inline-palette';
import { resolvePath, useGetCachedWorkspaceFiles } from 'workspace/index';
import { backLinkNodeName, palettePluginKey } from './config';

export function InlineBacklinkPalette() {
  const { query, counter } = useInlinePaletteQuery(palettePluginKey);
  const [currentFiles = []] = useGetCachedWorkspaceFiles();

  const items = useMemo(() => {
    if (!query) {
      return [];
    }

    const items = currentFiles.map((wsPath) => {
      return {
        uid: wsPath,
        title: wsPath,
        editorExecuteCommand: ({ item }) => {
          return (state, dispatch, view) => {
            let nodeType = state.schema.nodes[backLinkNodeName];
            return replaceSuggestionMarkWith(
              palettePluginKey,
              nodeType.create({
                title: resolvePath(wsPath).fileName,
                wsPath: wsPath,
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
  );

  return reactDOM.createPortal(
    <div className="bangle-emoji-suggest">
      {query === '' && (
        <SidebarRow
          dataId="searchNote"
          className="palette-row"
          title="Search for a note"
        />
      )}
      {items.map((item, i) => {
        return (
          <SidebarRow
            key={item.uid}
            dataId={item.uid}
            className="palette-row"
            title={item.title}
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
