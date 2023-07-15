export {
  useNsmEditorManagerState,
  useNsmEditorManagerStore,
} from './EditorManagerContext';
export {
  focusEditorIfNotFocused,
  forEachEditor,
  getEditor,
  getInitialSelection,
  nsmEditorEffects,
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
