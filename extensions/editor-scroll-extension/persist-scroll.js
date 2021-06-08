import { getScrollParentElement } from 'utils/index';
import { extensionName } from './config';

const LOG = true;

const log = LOG ? console.log.bind(console, extensionName) : () => {};

export const key = (editorId, wsPath) =>
  extensionName + ':' + editorId + '::' + wsPath;

export function getSavedScrollPos(wsPath, editorId) {
  const result = parseInt(sessionStorage.getItem(key(wsPath, editorId)), 10);
  log('getting', key(wsPath, editorId), result);
  return Number.isNaN(result) ? undefined : result;
}

export function saveScrollPos(wsPath, editorId) {
  const scrollPos = getScrollParentElement(editorId)?.scrollTop;
  log('saveScrollPos', key(wsPath, editorId), scrollPos);
  sessionStorage.setItem(key(wsPath, editorId), scrollPos);
}
