import { Slice as EditorSlice } from '@bangle.dev/pm';

import { internalApi, nsmApi2 } from '@bangle.io/api';
import { config } from '@bangle.io/config';
import * as constants from '@bangle.io/constants';
import type { NSME2eTypes } from '@bangle.io/e2e-types';
import { getEditorPluginMetadata } from '@bangle.io/editor-common';
import type { Store } from '@bangle.io/nsm-3';
import { effect } from '@bangle.io/nsm-3';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import { sliceManualPaste } from '@bangle.io/pm-manual-paste';
import {
  getEditor,
  nsmEditorManagerSlice,
} from '@bangle.io/slice-editor-manager';
import { nsmPageSlice } from '@bangle.io/slice-page';
import type { WsPath } from '@bangle.io/storage';
import { BaseError } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

const getGlobalNsmStore = (): Store => {
  return internalApi._internal_getStore();
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
    return nsmPageSlice.get(getGlobalNsmStore().state);
  },
  getOpenedWsPaths: () => {
    return nsmSliceWorkspace.get(getGlobalNsmStore().state).openedWsPaths;
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
    await naukarProxy.test.requestDeleteCollabInstance(wsPath);
  },

  e2eHealthCheck: async () => {
    assertOk(await naukarProxy.test.status(), 'naukarProxy.status failed');

    assertOk(
      (await naukarProxy.test.handlesBaseError(
        new BaseError({ message: 'test' }),
      )) instanceof BaseError,
      'naukarProxy.test.handlesBaseError failed',
    );
    assertOk(
      await naukarProxy.test.isWorkerEnv(),
      'naukarProxy.test.isWorkerEnv failed',
    );

    // one more status at end to make sure worker is
    // still alive
    assertOk(await naukarProxy.test.status(), 'naukarProxy.status failed');

    return true;
  },
};

if (typeof window !== 'undefined') {
  window._nsmE2e = e2e;
}

const nsmE2eSyncEffect = effect(
  function nsmE2eSyncEffect(store) {
    const { primaryEditor } = nsmEditorManagerSlice.track(store);
    const { secondaryEditor } = nsmEditorManagerSlice.track(store);

    e2e.primaryEditor = primaryEditor;
    e2e.secondaryEditor = secondaryEditor;
  },
  { deferred: false },
);
const nsmE2eEffect = effect(function nsmE2eEffect() {});

export const nsmE2eEffects = [nsmE2eSyncEffect, nsmE2eEffect];

function assertOk(value: boolean, message?: string) {
  if (!value) {
    throw new Error(message || 'assertion failed');
  }
}
