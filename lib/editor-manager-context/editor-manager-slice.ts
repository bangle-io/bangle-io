interface EditorManagerSlice {
  focusedEditorId: number | undefined;
  forEachEditor: (cb: (editor: BangleEditor, index: number) => void) => void;
  getEditor: (editorId: number) => BangleEditor | undefined;
  getEditorState: (editorId: number) => EditorState | undefined;
  getEditorView: (editorId: number) => EditorView | undefined;
  primaryEditor: BangleEditor | undefined;
  secondaryEditor: BangleEditor | undefined;
  setEditor: (editorId: number, editor: BangleEditor) => void;
  updateFocusedEditor: (editorId: number | undefined) => void;
}

type EditorsType = [BangleEditor | undefined, BangleEditor | undefined];
const EditorManagerContext = React.createContext<EditorManagerContextValue>({
  focusedEditorId: undefined,
  forEachEditor: () => {},
  getEditor: () => undefined,
  getEditorState: () => undefined,
  getEditorView: () => undefined,
  primaryEditor: undefined,
  secondaryEditor: undefined,
  setEditor: () => {},
  updateFocusedEditor: () => {},
});

export const uiSliceKey = new SliceKey<UISliceState, UiContextAction>(
  'ui-slice',
);

export function editorManagerSlice<T = any>(): Slice<
  UISliceState,
  UiContextAction,
  T
> {}
