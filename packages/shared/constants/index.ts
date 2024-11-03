import type { ColorScheme } from '../types';

const LIGHT_SCHEME = 'light' satisfies ColorScheme;
const DARK_SCHEME = 'dark' satisfies ColorScheme;

export const COLOR_SCHEME = {
  LIGHT: LIGHT_SCHEME,
  DARK: DARK_SCHEME,
} as const;

export const WIDESCREEN_WIDTH = 759;
