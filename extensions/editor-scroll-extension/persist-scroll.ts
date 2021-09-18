import { Selection } from '@bangle.dev/pm';
import { extensionName } from './config';

const LOG = false;

const log = LOG ? console.log.bind(console, extensionName) : () => {};

const key = (type, editorId, wsPath) =>
  extensionName + ':' + editorId + ':' + type + '::' + wsPath;

const scrollKey = (editorId, wsPath) => key('scroll', editorId, wsPath);
const selectionKey = (editorId, wsPath) => key('selection', editorId, wsPath);

export function getSavedScrollPos(wsPath, editorId) {
  const result = parseInt(
    sessionStorage.getItem(scrollKey(wsPath, editorId)) || '',
    10,
  );
  log('getting', scrollKey(wsPath, editorId), result);
  return Number.isNaN(result) ? undefined : result;
}

export function saveScrollPos(wsPath, editorId, value) {
  if (typeof value === 'number') {
    sessionStorage.setItem(scrollKey(wsPath, editorId), value.toString());
  }
}

export function getSavedSelection(wsPath, editorId, doc) {
  const stored = sessionStorage.getItem(selectionKey(wsPath, editorId));
  if (stored == null) {
    return undefined;
  }
  try {
    log('getting', selectionKey(wsPath, editorId), stored);

    const rawSelection = JSON.parse(
      sessionStorage.getItem(selectionKey(wsPath, editorId)) || '{}',
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

export function saveSelection(wsPath, editorId, selection) {
  const json = selection.toJSON();
  log('saveSelection', selectionKey(wsPath, editorId), json);

  sessionStorage.setItem(selectionKey(wsPath, editorId), JSON.stringify(json));
}
