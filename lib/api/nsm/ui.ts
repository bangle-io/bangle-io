import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import type { WsPath } from '@bangle.io/shared-types';
import { nsmNotification } from '@bangle.io/slice-notification';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';

import { _internal_getStore } from './internal/internals';

export function useUi() {
  return useNsmSliceState(nsmUISlice);
}

// export const pick = nsmUI.nsmUISlice.pick;
// export const passivePick = nsmUI.nsmUISlice.passivePick;

export const uiState = () => {
  const store = _internal_getStore();

  return nsmUI.nsmUISlice.get(store.state);
};

export const closeSidebar = (): void => {
  const store = _internal_getStore();
  store.dispatch(nsmUI.closeSidebar());
};
export const togglePalette = (
  ...args: Parameters<typeof nsmUI.togglePalette>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmUI.togglePalette(...args));
};

export const updatePalette = (
  ...args: Parameters<typeof nsmUI.updatePalette>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmUI.updatePalette(...args));
};

export const resetPalette = (
  ...args: Parameters<typeof nsmUI.resetPalette>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmUI.resetPalette(...args));
};

export const changeSidebar = (
  ...args: Parameters<typeof nsmUI.changeSidebar>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmUI.changeSidebar(...args));
};
export const toggleSideBar = (
  ...args: Parameters<typeof nsmUI.toggleSideBar>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmUI.toggleSideBar(...args));
};

export const toggleNoteSidebar = (
  ...args: Parameters<typeof nsmUI.toggleNoteSidebar>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmUI.toggleNoteSidebar(...args));
};

export const toggleColorSchema = (
  ...args: Parameters<typeof nsmUI.toggleColorSchema>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmUI.toggleColorSchema(...args));
};

export const showDialog = (
  ...args: Parameters<typeof nsmUI.showDialog>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmUI.showDialog(...args));
};

export const updateChangelogHasUpdates = (
  ...args: Parameters<typeof nsmUI.updateChangelogHasUpdates>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmUI.updateChangelogHasUpdates(...args));
};

export const dismissDialog = (
  ...args: Parameters<typeof nsmUI.dismissDialog>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmUI.dismissDialog(...args));
};

export const showNotification = (
  ...args: Parameters<typeof nsmNotification.showNotification>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmNotification.showNotification(...args));
};
export const clearAllNotifications = (
  ...args: Parameters<typeof nsmNotification.clearAllNotifications>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmNotification.clearAllNotifications(...args));
};

export const setEditorIssue = (
  ...args: Parameters<typeof nsmNotification.setEditorIssue>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmNotification.setEditorIssue(...args));
};

export const clearEditorIssue = (
  ...args: Parameters<typeof nsmNotification.clearEditorIssue>
): void => {
  const store = _internal_getStore();
  store.dispatch(nsmNotification.clearEditorIssue(...args));
};

export const getEditorIssue = (wsPath: WsPath) => {
  const store = _internal_getStore();

  return nsmNotification.getEditorIssue(store.state, wsPath);
};
