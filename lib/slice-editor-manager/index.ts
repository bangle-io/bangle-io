export { editorManagerSliceKey } from './constants';
export {
  editorManagerSlice,
  initialEditorSliceState,
} from './editor-manager-slice';
export { useEditorManagerContext } from './EditorManagerContext';
export {
  didSomeEditorChange,
  dispatchEditorCommand,
  focusPrimaryEditor,
  focusSecondaryEditor,
  forEachEditor,
  getEditor,
  getEditorState,
  getEditorView,
  getInitialSelection,
  isEditingAllowed,
  setEditorReady,
  setEditorUnmounted,
  toggleEditing,
  updateFocusedEditor,
} from './operations';
export type { EditorIdType, EditorManagerAction } from './types';
