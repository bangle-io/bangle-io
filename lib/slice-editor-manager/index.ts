export {
  useNsmEditorManagerState,
  useNsmEditorManagerStore,
} from './EditorManagerContext';
export {
  dispatchEditorCommand,
  forEachEditor,
  getEditor,
  getInitialSelection,
  nsmEditorManagerSlice,
  onFocusUpdate,
  persistState,
  setEditor,
  setEditorScrollPos,
  toggleEditing,
  toggleEditingDirect,
  updateSelection,
} from './nsm-editor-manager-slice';
export type { EditorIdType, EditorManagerAction } from './types';
