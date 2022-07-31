import { workerEditorSliceKey } from './common';

export function getCollabManager() {
  return workerEditorSliceKey.queryOp((state) => {
    return workerEditorSliceKey.getSliceStateAsserted(state).collabManager;
  });
}

// removes a collab doc from the memory of collab manager
// if any client is connected, it will trigger a hard reload
// ~ discarding any unsaved data and reloading with fresh data
export function resetCollabDoc(wsPath: string) {
  return workerEditorSliceKey.queryOp((state) => {
    const editorManager = getCollabManager()(state);
    console.warn(`editorManagerSlice resetting ${wsPath} collab-state`);
    editorManager?.resetDoc(wsPath);
  });
}
