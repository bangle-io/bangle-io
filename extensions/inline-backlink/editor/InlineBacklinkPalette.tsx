import React, { useEffect, useMemo } from 'react';
import reactDOM from 'react-dom';

import type { EditorState, EditorView } from '@bangle.dev/pm';
import { useEditorViewContext } from '@bangle.dev/react';

import { nsmApi2 } from '@bangle.io/api';
import { byLengthAsc, useFzfSearch } from '@bangle.io/fzf-search';
import {
  replaceSuggestionMarkWith,
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from '@bangle.io/inline-palette';
import { InlinePaletteRow, UniversalPalette } from '@bangle.io/ui-components';
import { assertNotUndefined, insertAt } from '@bangle.io/utils';
import {
  removeExtension,
  resolvePath,
  suffixWithNoteExtension,
} from '@bangle.io/ws-path';

import { backlinkNodeName, palettePluginKey } from '../config';
import { getBacklinkPath, wsPathFromQuery } from '../utils';

const FZF_SEARCH_LIMIT = 12;

// Creating this also closes the palette
const createBacklinkNode = (
  wsPath: string,
  allNoteWsPaths: readonly string[],
) => {
  return (
    state: EditorState,
    dispatch: EditorView['dispatch'] | undefined,
    view: EditorView | undefined,
  ) => {
    const nodeType = state.schema.nodes[backlinkNodeName];
    const backlinkPath = getBacklinkPath(wsPath, allNoteWsPaths);

    assertNotUndefined(nodeType, 'wikiLink must be defined');

    return replaceSuggestionMarkWith(
      palettePluginKey,
      nodeType.create({
        path: backlinkPath,
      }),
    )(state, dispatch, view);
  };
};

export function InlineBacklinkPalette() {
  const view = useEditorViewContext();

  if (!view || view.isDestroyed) {
    return null;
  }

  return <InlineBacklinkPalettePortal />;
}

function InlineBacklinkPalettePortal() {
  const { query, counter, tooltipContentDOM, isVisible } =
    useInlinePaletteQuery(palettePluginKey);

  return reactDOM.createPortal(
    <InlineBacklinkPaletteWrapper
      query={query}
      counter={counter}
      isVisible={isVisible}
      editorView={useEditorViewContext()}
    />,
    tooltipContentDOM,
  );
}

export function InlineBacklinkPaletteWrapper({
  query,
  counter,
  isVisible,
  editorView,
}: {
  query: string;
  counter: number;
  isVisible: boolean;
  editorView: EditorView;
}) {
  return (
    <div className="shadow-2xl B-ui-components_inline-palette-wrapper flex flex-col bg-colorNeutralBgLayerFloat">
      <div className="B-ui-components_inline-palette-items-wrapper">
        {/* TODO I am unable to hide inner when palette is invisible */}
        {isVisible && (
          <InlineBacklinkPaletteInner
            query={query}
            counter={counter}
            editorView={editorView}
          />
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
    </div>
  );
}

const EMPTY_ARRAY: string[] = [];

function InlineBacklinkPaletteInner({
  query,
  editorView: view,
  counter,
}: {
  query: string;
  counter: number;
  editorView: EditorView;
}) {
  const { wsName, noteWsPaths = EMPTY_ARRAY } =
    nsmApi2.workspace.useWorkspace();

  const match = useFzfSearch(noteWsPaths, query, {
    limit: FZF_SEARCH_LIMIT,
    selector: (item: any) => resolvePath(item, true).filePath,
    tiebreakers: [byLengthAsc],
  });

  const items = useMemo(() => {
    let res = match.map((r) => {
      const wsPath = r.item;

      return {
        wsPath: wsPath,
        uid: wsPath,
        title: removeExtension(resolvePath(wsPath, true).filePath),
        editorExecuteCommand: () => {
          return createBacklinkNode(wsPath, noteWsPaths);
        },
      };
    });

    const exactMatch = res.find(
      (item) =>
        item.title === query ||
        suffixWithNoteExtension(query) ===
          resolvePath(item.wsPath, true).filePath,
    );

    if (!exactMatch && query.length > 0 && wsName) {
      const wsPath = wsPathFromQuery(query, wsName);

      let createItem = {
        uid: 'create-' + wsPath,
        wsPath: wsPath,
        title: 'Create: ' + removeExtension(resolvePath(wsPath).filePath),
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
