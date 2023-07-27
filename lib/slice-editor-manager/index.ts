export {
  onFocusUpdate,
  setEditor,
  toggleEditing,
  updateQueryAction,
  updateSelection,
} from './actions';
export { searchPluginKey } from './constants';
export { nsmEditorEffects } from './effects';
export {
  focusEditorIfNotFocused,
  forEachEditor,
  getEditor,
  getInitialSelection,
  nsmEditorManagerSlice,
  persistState,
  setEditorScrollPos,
} from './slice';
export type { EditorIdType } from './types';
