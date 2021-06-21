import React, { useMemo, useEffect, useContext } from 'react';
import reactDOM from 'react-dom';
import { useEditorViewContext } from '@bangle.dev/react';
import {
  useInlinePaletteItems,
  useInlinePaletteQuery,
  replaceSuggestionMarkWith,
} from 'inline-palette/index';
import { UniversalPalette, InlinePaletteRow } from 'ui-components/index';
import {
  resolvePath,
  filePathToWsPath,
  validateWsPath,
  sanitizeFilePath,
} from 'ws-path';
import { backLinkNodeName, palettePluginKey } from './config';
import { conditionalSuffix, removeMdExtension } from 'utils/index';
import { useWorkspaceContext } from 'workspace-context/index';

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
    <div className="inline-palette-wrapper shadow-2xl">
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

function InlineBacklinkPaletteInner({ query, counter }) {
  const view = useEditorViewContext();
  const { wsName, noteWsPaths = [] } = useWorkspaceContext();
  const items = useMemo(() => {
    return filterItems(wsName, query, noteWsPaths);
  }, [query, noteWsPaths, wsName]);

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
            rightHoverIcon={item.rightHoverIcon}
            rightIcon={
              <kbd className="whitespace-nowrap">{item.keybinding}</kbd>
            }
            {...getItemProps(item, i)}
          />
        );
      })}
    </>
  );
}

export function filterItems(wsName, query, allNoteWsPaths) {
  if (!query) {
    return [];
  }

  const items = allNoteWsPaths.map((wsPath) => {
    return {
      wsPath,
      uid: wsPath,
      title: removeMdExtension(resolvePath(wsPath).filePath),
      editorExecuteCommand: () => {
        return createBackLinkNode(wsPath, allNoteWsPaths);
      },
    };
  });

  let filteredItems = items
    .filter((item) => queryMatch(item, query))
    .slice(0, 15);

  const exactMatch = filteredItems.find(
    (item) =>
      item.title === query ||
      conditionalSuffix(query, '.md') === resolvePath(item.wsPath).filePath,
  );
  if (!exactMatch && query.length > 0) {
    const wsPath = wsPathFromQuery(query, wsName);

    filteredItems.unshift({
      uid: 'create-' + wsPath,
      title: 'Create: ' + removeMdExtension(resolvePath(wsPath).filePath),
      editorExecuteCommand: () => {
        return createBackLinkNode(wsPath, allNoteWsPaths);
      },
    });
  }

  return filteredItems;
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

export function getBacklinkPath(wsPath, allWsPaths) {
  const { fileName, filePath } = resolvePath(wsPath);
  const matchingFilenames = allWsPaths.filter(
    (w) => resolvePath(w).fileName === fileName,
  );

  if (matchingFilenames.length === 0) {
    return removeMdExtension(filePath);
  }

  // if there are multiple files with the same name
  // give it an absolute path
  if (matchingFilenames.length > 1) {
    return removeMdExtension(filePath);
  }

  return removeMdExtension(fileName);
}

function wsPathFromQuery(query, wsName) {
  let filePath = query.split(']]').join('');
  filePath = filePath.trim();
  filePath = conditionalSuffix(filePath, '.md');
  let wsPath = filePathToWsPath(wsName, filePath);
  try {
    validateWsPath(wsPath);
  } catch (error) {
    wsPath = filePathToWsPath(wsName, sanitizeFilePath(filePath));
  }

  return wsPath;
}
