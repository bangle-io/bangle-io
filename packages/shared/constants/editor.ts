export const MAX_OPEN_EDITORS = 4;

export enum EditorIndex {
  PRIMARY,
  SECONDARY,
  MINI,
  POPUP,
}

export enum EditorDisplayType {
  // Full editor experience
  Page = 'PAGE',
  // Floating editors are floating
  Floating = 'Floating',
}
