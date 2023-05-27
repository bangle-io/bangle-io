import { Slice as EditorSlice } from '@bangle.dev/pm';

import { nsmApi2 } from '@bangle.io/api';
import { config } from '@bangle.io/config';
import * as constants from '@bangle.io/constants';
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
import type { WsPath } from '@bangle.io/storage';
import { BaseError, getEditorPluginMetadata } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

const getGlobalNsmStore = (): NsmStore => {
  return (window as any).globalNsmStore;
};

let e2e: NSME2eTypes = {
  nsmApi2,
  config,
  constants,
  sliceManualPaste,
  EditorSlice,
  getEditorPluginMetadata,
  getNsmStore: getGlobalNsmStore,
  getPageSliceState: () => {
    return nsmPageSlice.getState(getGlobalNsmStore().state);
  },
  getOpenedWsPaths: () => {
    return nsmSliceWorkspace.resolveState(getGlobalNsmStore().state)
      .openedWsPaths;
  },
  getEditorDetailsById: (id) => {
    const editor = getEditor(getGlobalNsmStore().state, id);

    if (!editor) {
      return undefined;
    }
    const metadata = getEditorPluginMetadata(editor.view.state);

    return {
      editor,
      wsPath: metadata.wsPath,
    };
  },

  testRequestDeleteCollabInstance: async (wsPath: WsPath) => {
    await naukarProxy.testRequestDeleteCollabInstance(wsPath);
  },

  e2eHealthCheck: async () => {
    assertOk(await naukarProxy.status(), 'naukarProxy.status failed');

    assertOk(
      (await naukarProxy.testHandlesBaseError(
        new BaseError({ message: 'test' }),
      )) instanceof BaseError,
      'naukarProxy.testHandlesBaseError failed',
    );
    assertOk(
      await naukarProxy.testIsWorkerEnv(),
      'naukarProxy.testIsWorkerEnv failed',
    );

    // one more status at end to make sure worker is
    // still alive
    assertOk(await naukarProxy.status(), 'naukarProxy.status failed');

    return true;
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

function assertOk(value: boolean, message?: string) {
  if (!value) {
    throw new Error(message || 'assertion failed');
  }
}
