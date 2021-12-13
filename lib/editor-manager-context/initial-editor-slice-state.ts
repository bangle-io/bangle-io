import type { EditorSliceState } from './editor-slice';

export const initialEditorSliceState: EditorSliceState = {
  focusedEditorId: undefined,
  editors: [undefined, undefined],
  primaryEditor: undefined,
  secondaryEditor: undefined,
};
