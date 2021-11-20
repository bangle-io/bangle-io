import { Node, Selection } from '@bangle.dev/pm';

import { extensionName } from './config';

const LOG = false;

const log = LOG ? console.log.bind(console, extensionName) : () => {};

const key = (type: string, editorId: number, wsPath: string) =>
  extensionName + ':' + editorId + ':' + type + '::' + wsPath;

const scrollKey = (editorId: number, wsPath: string) =>
  key('scroll', editorId, wsPath);

const selectionKey = (editorId: number, wsPath: string) =>
  key('selection', editorId, wsPath);

export function getSavedScrollPos(wsPath: string, editorId: number) {
  const result = parseInt(
    sessionStorage.getItem(scrollKey(editorId, wsPath)) || '',
    10,
  );
  log('getting', scrollKey(editorId, wsPath), result);
  return Number.isNaN(result) ? undefined : result;
}

export function saveScrollPos(wsPath: string, editorId: number, value) {
  if (typeof value === 'number') {
    sessionStorage.setItem(scrollKey(editorId, wsPath), value.toString());
  }
}

export function getSavedSelection(wsPath: string, editorId: number, doc: Node) {
  const stored = sessionStorage.getItem(selectionKey(editorId, wsPath));
  if (stored == null) {
    return undefined;
  }
  try {
    log('getting', selectionKey(editorId, wsPath), stored);

    const rawSelection = JSON.parse(
      sessionStorage.getItem(selectionKey(editorId, wsPath)) || '{}',
    );

    if (Math.max(rawSelection.anchor, rawSelection.head) >= doc.content.size) {
      return Selection.atEnd(doc);
    }

    const result = Selection.fromJSON(doc, rawSelection);
    return result;
  } catch (err) {
    console.error(err);
    return undefined;
  }
}

export function saveSelection(
  wsPath: string,
  editorId: number,
  selection: Selection,
) {
  const json = selection.toJSON();
  log('saveSelection', selectionKey(editorId, wsPath), json);

  sessionStorage.setItem(selectionKey(editorId, wsPath), JSON.stringify(json));
}
