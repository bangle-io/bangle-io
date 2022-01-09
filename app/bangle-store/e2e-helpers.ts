import { ApplicationStore, Slice } from '@bangle.io/create-store';
import { getEditorPluginMetadata } from '@bangle.io/utils';
import * as workspaceContext from '@bangle.io/workspace-context';
import * as editorManagerContext from '@bangle.io/editor-manager-context';
import {
  didSomeEditorChange,
  editorManagerSliceKey,
} from '@bangle.io/editor-manager-context';

// makes life easier by adding some helpers for e2e tests
export function e2eHelpers() {
  return new Slice({
    sideEffect(store) {
      let e2eHelpers: { [r: string]: any } = {};

      (window as any)._e2eHelpers = e2eHelpers;

      // for e2e testing
      e2eHelpers._appStore = store;
      e2eHelpers._getWsPaths = () =>
        workspaceContext.workspaceSliceKey.getSliceState(store.state)?.wsPaths;
      e2eHelpers._pushWsPath = (wsPath: string, secondary: boolean) =>
        workspaceContext.pushWsPath(
          wsPath,
          undefined,
          secondary,
        )(store.state, store.dispatch);
      e2eHelpers._getEditorPluginMetadata = getEditorPluginMetadata;
      e2eHelpers._getEditors = () =>
        editorManagerContext.editorManagerSliceKey.getSliceState(store.state)
          ?.editors;

      return {
        update(store, prevState) {
          if (prevState && !didSomeEditorChange(prevState)(store.state)) {
            console.count('same');
            return;
          }
          const editors = editorManagerSliceKey.getSliceState(
            store.state,
          )?.editors;
          if (editors) {
            e2eHelpers._primaryEditor = editors[0];
            e2eHelpers._secondaryEditor = editors[1];
          }
        },
      };
    },
  });
}
