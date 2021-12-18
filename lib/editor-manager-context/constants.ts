import { SliceKey } from '@bangle.io/create-store';

import type { EditorManagerAction, EditorSliceState } from './types';

export const editorManagerSliceKey = new SliceKey<
  EditorSliceState,
  EditorManagerAction
>('editor-manager-slice');

// The time to wait before auto focusing any newly
// mounted editor
export const FOCUS_EDITOR_ON_LOAD_COOLDOWN = 400;
