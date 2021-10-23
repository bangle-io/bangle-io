import { useEditorViewContext } from '@bangle.dev/react';
import {
  replaceSuggestionMarkWith,
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from 'inline-palette';
import React, { useEffect, useMemo } from 'react';
import reactDOM from 'react-dom';
import { InlinePaletteRow, UniversalPalette } from 'ui-components';
import { conditionalSuffix, insertAt, removeMdExtension } from 'utils';
import { useWorkspaceContext } from 'workspace-context';
import { resolvePath } from 'ws-path';
import { backLinkNodeName, palettePluginKey } from '../config';
import { getBacklinkPath, wsPathFromQuery } from '../utils';

import { useFzfSearch, byLengthAsc } from 'fzf-search';

// Creating this also closes the palette
const createBackLinkNode = (wsPath, allNoteWsPaths) => {
  return (state, dispatch, view) => {
    const nodeType = state.schema.nodes[backLinkNodeName];
    const backLinkPath = getBacklinkPath(wsPath, allNoteWsPaths);

    return replaceSuggestionMarkWith(
      palettePluginKey,
      nodeType.create({
        path: backLinkPath,
      }),
    )(state, dispatch, view);
  };
};
export function InlineBacklinkPalette() {
  const { query, counter, tooltipContentDOM } =
    useInlinePaletteQuery(palettePluginKey);

  return reactDOM.createPortal(
    <div className="shadow-2xl inline-palette-wrapper">
      <div className="inline-palette-items-wrapper">
        {/* TODO I am unable to hide inner when palette is invisible */}
        <InlineBacklinkPaletteInner query={query} counter={counter} />
        <UniversalPalette.PaletteInfo>
          <UniversalPalette.PaletteInfoItem>
            <kbd className="font-normal">↑↓</kbd> Navigate
          </UniversalPalette.PaletteInfoItem>
          <UniversalPalette.PaletteInfoItem>
            <kbd className="font-normal">Enter</kbd> Create link
          </UniversalPalette.PaletteInfoItem>
          <UniversalPalette.PaletteInfoItem>
            <kbd className="font-normal">Esc</kbd> Dismiss
          </UniversalPalette.PaletteInfoItem>
        </UniversalPalette.PaletteInfo>
      </div>
    </div>,
    tooltipContentDOM,
  );
}

const EMPTY_ARRAY = [];
function InlineBacklinkPaletteInner({
  query,
  counter,
}: {
  query: string;
  counter: number;
}) {
  const view = useEditorViewContext();
  const { wsName, noteWsPaths = EMPTY_ARRAY } = useWorkspaceContext();

  const match = useFzfSearch<string>(noteWsPaths, query, {
    limit: 12,
    selector: (item) => resolvePath(item).filePath,
    tiebreakers: [byLengthAsc],
  });

  const items = useMemo(() => {
    let res = match.map((r) => {
      const wsPath = r.item;
      return {
        wsPath: wsPath,
        uid: wsPath,
        title: removeMdExtension(resolvePath(wsPath).filePath),
        editorExecuteCommand: () => {
          return createBackLinkNode(wsPath, noteWsPaths);
        },
      };
    });

    const exactMatch = res.find(
      (item) =>
        item.title === query ||
        conditionalSuffix(query, '.md') === resolvePath(item.wsPath).filePath,
    );

    if (!exactMatch && query.length > 0) {
      const wsPath = wsPathFromQuery(query, wsName);

      let createItem = {
        uid: 'create-' + wsPath,
        wsPath: wsPath,
        title: 'Create: ' + removeMdExtension(resolvePath(wsPath).filePath),
        editorExecuteCommand: () => {
          return createBackLinkNode(wsPath, noteWsPaths);
        },
      };
      res = insertAt(res, 1, createItem);
    }

    return res;
  }, [noteWsPaths, match, wsName, query]);

  const { getItemProps } = useInlinePaletteItems(
    palettePluginKey,
    items,
    counter,
    () => false,
  );

  useEffect(() => {
    if (query === ']]' || query.includes('[[')) {
      replaceSuggestionMarkWith(palettePluginKey, '')(
        view.state,
        view.dispatch,
        view,
      );
    } else if (query.endsWith(']]')) {
      createBackLinkNode(wsPathFromQuery(query, wsName), noteWsPaths)(
        view.state,
        view.dispatch,
        view,
      );
    }
  }, [query, wsName, view, noteWsPaths]);

  return (
    <>
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
            description={item.title}
            {...getItemProps(item, i)}
          />
        );
      })}
    </>
  );
}
