export const MAX_OPEN_EDITORS = 4;

export enum EditorIndex {
  PRIMARY = 0,
  SECONDARY = 1,
  MINI = 2,
  POPUP = 3,
}

export enum EditorDisplayType {
  // Full editor experience
  Page = 'PAGE',
  // Floating editors are floating
  Floating = 'Floating',
}
