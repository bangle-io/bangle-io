export const MAX_OPEN_EDITORS = 4;

// TODO can make these nominal types
// Warning!: Donot change the indices unless you are really sure of what you are doing.
// This warning exists because a lot of places are directly using the integer values.
export const PRIMARY_EDITOR_INDEX = 0;
// secondary editor is generally the one on the split screen right side
export const SECONDARY_EDITOR_INDEX = 1;
export const MINI_EDITOR_INDEX = 2;
export const POPUP_EDITOR_INDEX = 3;

export enum EditorDisplayType {
  // Full editor experience
  Page = 'PAGE',
  // Floating editors are floating
  Floating = 'Floating',
}
