import type { BangleEditor } from '@bangle.dev/core';

import type { OpenedEditorsConfig } from './opened-editors-config';

// TODO: can make this a nominal type
export type EditorIdType = number;

export interface EditorSliceState {
  // WARNING: avoid using editor in the useMemo or any React Hooks or React.memo or React.PureComponent
  // dependency array as it causes memory leak due to react caching the editor for future use
  // but an editor will never reused once it is detroyed.
  // Please see https://github.com/bangle-io/bangle-io/blob/dev/lib/editor/Editor.tsx for
  // an indepth explaination.
  focusedEditorId: EditorIdType | undefined;
  mainEditors: Array<BangleEditor | undefined>;
  editorConfig: OpenedEditorsConfig;
  primaryEditor: BangleEditor | undefined;
  secondaryEditor: BangleEditor | undefined;
  editingAllowed: boolean;
  // the editor that was last opened
  // the most recent editor id is the first in array
  editorOpenOrder: EditorIdType[];
  disableEditingCounter: number | undefined;
  searchQuery: RegExp | undefined;
}
