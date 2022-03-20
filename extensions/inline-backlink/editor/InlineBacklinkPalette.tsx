import React, { useEffect, useMemo } from 'react';
import reactDOM from 'react-dom';

import { EditorState, EditorView } from '@bangle.dev/pm';
import { useEditorViewContext } from '@bangle.dev/react';

import { byLengthAsc, useFzfSearch } from '@bangle.io/fzf-search';
import {
  replaceSuggestionMarkWith,
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from '@bangle.io/inline-palette';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { InlinePaletteRow, UniversalPalette } from '@bangle.io/ui-components';
import {
  conditionalSuffix,
  insertAt,
  removeMdExtension,
} from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import { backlinkNodeName, palettePluginKey } from '../config';
import { getBacklinkPath, wsPathFromQuery } from '../utils';

const FZF_SEARCH_LIMIT = 12;

// Creating this also closes the palette
const createBacklinkNode = (wsPath: string, allNoteWsPaths: string[]) => {
  return (
    state: EditorState,
    dispatch: EditorView['dispatch'] | undefined,
    view: EditorView | undefined,
  ) => {
    const nodeType = state.schema.nodes[backlinkNodeName];
    const backlinkPath = getBacklinkPath(wsPath, allNoteWsPaths);

    return replaceSuggestionMarkWith(
      palettePluginKey,
      nodeType.create({
        path: backlinkPath,
      }),
    )(state, dispatch, view);
  };
};
export function InlineBacklinkPalette() {
  const { query, counter, tooltipContentDOM, isVisible } =
    useInlinePaletteQuery(palettePluginKey);

  return reactDOM.createPortal(
    <div className="shadow-2xl inline-palette-wrapper">
      <div className="inline-palette-items-wrapper">
        {/* TODO I am unable to hide inner when palette is invisible */}
        {isVisible && (
          <InlineBacklinkPaletteInner query={query} counter={counter} />
        )}
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

const EMPTY_ARRAY: string[] = [];

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
    limit: FZF_SEARCH_LIMIT,
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
          return createBacklinkNode(wsPath, noteWsPaths);
        },
      };
    });

    const exactMatch = res.find(
      (item) =>
        item.title === query ||
        conditionalSuffix(query, '.md') === resolvePath(item.wsPath).filePath,
    );

    if (!exactMatch && query.length > 0 && wsName) {
      const wsPath = wsPathFromQuery(query, wsName);

      let createItem = {
        uid: 'create-' + wsPath,
        wsPath: wsPath,
        title: 'Create: ' + removeMdExtension(resolvePath(wsPath).filePath),
        editorExecuteCommand: () => {
          return createBacklinkNode(wsPath, noteWsPaths);
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
    if (!wsName) {
      return;
    }
    if (query === ']]' || query.includes('[[')) {
      replaceSuggestionMarkWith(palettePluginKey, '')(
        view.state,
        view.dispatch,
        view,
      );
    } else if (query.endsWith(']]')) {
      createBacklinkNode(wsPathFromQuery(query, wsName), noteWsPaths)(
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
