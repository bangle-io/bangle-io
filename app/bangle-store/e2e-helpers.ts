import { Slice as EditorSlice } from '@bangle.dev/pm';

import { Slice } from '@bangle.io/create-store';
import { sliceManualPaste } from '@bangle.io/pm-manual-paste';
import * as editorManagerContext from '@bangle.io/slice-editor-manager';
import {
  didSomeEditorChange,
  editorManagerSliceKey,
} from '@bangle.io/slice-editor-manager';
import { pageSliceKey } from '@bangle.io/slice-page';
import * as workspaceContext from '@bangle.io/slice-workspace';
import { BaseError, getEditorPluginMetadata } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';
// makes life easier by adding some helpers for e2e tests
export function e2eHelpers() {
  return new Slice({
    sideEffect() {
      let e2eHelpers: { [r: string]: any } = {};
      return {
        destroy() {
          e2eHelpers = {};
        },
        deferredOnce(store, abortSignal) {
          (window as any)._e2eHelpers = e2eHelpers;

          e2eHelpers._naukarProxy = naukarProxy;

          e2eHelpers._getPageSliceState = () =>
            pageSliceKey.getSliceStateAsserted(store.state);
          e2eHelpers._sliceManualPaste = sliceManualPaste;
          e2eHelpers._EditorSlice = EditorSlice;
          // for e2e testing
          e2eHelpers._appStore = store;
          e2eHelpers._getWsPaths = () =>
            workspaceContext.workspaceSliceKey.getSliceState(store.state)
              ?.wsPaths;
          e2eHelpers._pushWsPath = (wsPath: string, secondary: boolean) =>
            workspaceContext.pushWsPath(
              wsPath,
              undefined,
              secondary,
            )(store.state, store.dispatch);
          e2eHelpers._getEditorPluginMetadata = getEditorPluginMetadata;
          e2eHelpers._getEditors = () =>
            editorManagerContext.editorManagerSliceKey.getSliceState(
              store.state,
            )?.editors;

          e2eHelpers.e2eHealthCheck = async () => {
            assertOk(
              (await naukarProxy.status()) === true,
              'naukarProxy.status failed',
            );

            assertOk(
              (await naukarProxy.testHandlesBaseError(
                new BaseError('test'),
              )) instanceof BaseError,
              'naukarProxy.testHandlesBaseError failed',
            );
            assertOk(
              (await naukarProxy.testIsWorkerEnv()) === true,
              'naukarProxy.testIsWorkerEnv failed',
            );

            // one more status at end to make sure worker is
            // still alive
            assertOk(
              (await naukarProxy.status()) === true,
              'naukarProxy.status failed',
            );

            return true;
          };
        },

        update(store, prevState) {
          if (prevState && !didSomeEditorChange(prevState)(store.state)) {
            return;
          }
          const editors = editorManagerSliceKey.getSliceState(
            store.state,
          )?.editors;

          if (editors) {
            e2eHelpers._primaryEditor = editors[0];
            e2eHelpers._secondaryEditor = editors[1];

            if (!e2eHelpers._editorSchema && editors[0]) {
              e2eHelpers._editorSchema = editors[0]?.view.state.schema;
            }
          }
        },
      };
    },
  });
}

function assertOk(value: boolean, message?: string) {
  if (!value) {
    throw new Error(message || 'assertion failed');
  }
}
