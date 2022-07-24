import { workerEditorSliceKey } from './common';

export function getCollabManager() {
  return workerEditorSliceKey.queryOp((state) => {
    return workerEditorSliceKey.getSliceStateAsserted(state).collabManager;
  });
}

export function resetCollabDoc(wsPath: string) {
  return workerEditorSliceKey.queryOp((state) => {
    const editorManager = getCollabManager()(state);
    console.warn(`editorManagerSlice resetting ${wsPath} collab-state`);
    editorManager?.resetDoc(wsPath);
  });
}
