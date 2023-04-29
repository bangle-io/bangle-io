import { Slice as EditorSlice } from '@bangle.dev/pm';

import type { NSME2eTypes } from '@bangle.io/e2e-types';
import { changeEffect, syncChangeEffect } from '@bangle.io/nsm';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import { sliceManualPaste } from '@bangle.io/pm-manual-paste';
import type { NsmStore } from '@bangle.io/shared-types';
import {
  getEditor,
  nsmEditorManagerSlice,
} from '@bangle.io/slice-editor-manager';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { getEditorPluginMetadata } from '@bangle.io/utils';

const getGlobalNsmStore = (): NsmStore => {
  return (window as any).nsmStore;
};
let e2e: NSME2eTypes = {
  sliceManualPaste,
  EditorSlice,
  getEditorPluginMetadata,
  getNsmStore: getGlobalNsmStore,
  getPageSliceState: () => {
    return nsmPageSlice.getState(getGlobalNsmStore().state);
  },
  getOpenedWsPaths: () => {
    return nsmSliceWorkspace.getState(getGlobalNsmStore().state).openedWsPaths;
  },
  getEditorDetailsById: (id) => {
    const editor = getEditor(getGlobalNsmStore().state, id);

    if (!editor) {
      return;
    }

    const metadata = getEditorPluginMetadata(editor.view.state);

    return {
      editor,
      wsPath: metadata.wsPath,
    };
  },
};

window._nsmE2e = e2e;

export const nsmE2eSyncEffect = syncChangeEffect(
  'nsmE2eSyncEffect',
  {
    primaryEditor: nsmEditorManagerSlice.pick((sl) => sl.primaryEditor),
    secondaryEditor: nsmEditorManagerSlice.pick((sl) => sl.secondaryEditor),
  },
  ({ primaryEditor, secondaryEditor }) => {
    e2e.primaryEditor = primaryEditor;
    e2e.secondaryEditor = secondaryEditor;
  },
);

export const nsmE2eEffect = changeEffect('nsmE2eEffect', {}, ({}) => {});
