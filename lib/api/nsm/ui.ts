import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import type { NotificationPayloadType } from '@bangle.io/constants';
import type { WsPath } from '@bangle.io/shared-types';
import { nsmNotification } from '@bangle.io/slice-notification';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';

import { getStore } from '../internals';

export function useUi() {
  return useNsmSliceState(nsmUISlice);
}

// export const pick = nsmUI.nsmUISlice.pick;
// export const passivePick = nsmUI.nsmUISlice.passivePick;

export const uiState = () => {
  const store = getStore();

  return nsmUI.nsmUISlice.resolveState(store.state);
};

export const closeSidebar = (): void => {
  const store = getStore();
  store.dispatch(nsmUI.closeSidebar());
};
export const togglePalette = (
  ...args: Parameters<typeof nsmUI.togglePalette>
): void => {
  const store = getStore();
  store.dispatch(nsmUI.togglePalette(...args));
};

export const changeSidebar = (
  ...args: Parameters<typeof nsmUI.changeSidebar>
): void => {
  const store = getStore();
  store.dispatch(nsmUI.changeSidebar(...args));
};

export const toggleNoteSidebar = (
  ...args: Parameters<typeof nsmUI.toggleNoteSidebar>
): void => {
  const store = getStore();
  store.dispatch(nsmUI.toggleNoteSidebar(...args));
};

export const showNotification = (
  notification: NotificationPayloadType,
): void => {
  const store = getStore();
  store.dispatch(nsmNotification.showNotification(notification));
};

export const setEditorIssue = (
  ...args: Parameters<typeof nsmNotification.setEditorIssue>
): void => {
  const store = getStore();
  store.dispatch(nsmNotification.setEditorIssue(...args));
};

export const clearEditorIssue = (
  ...args: Parameters<typeof nsmNotification.clearEditorIssue>
): void => {
  const store = getStore();
  store.dispatch(nsmNotification.clearEditorIssue(...args));
};

export const getEditorIssue = (wsPath: WsPath) => {
  const store = getStore();

  return nsmNotification.getEditorIssue(store.state, wsPath);
};
