import type { ColorScheme } from '../types';

const LIGHT_SCHEME = 'light' satisfies ColorScheme;
const DARK_SCHEME = 'dark' satisfies ColorScheme;

export const COLOR_SCHEME = {
  LIGHT: LIGHT_SCHEME,
  DARK: DARK_SCHEME,
} as const;

export const WIDESCREEN_WIDTH = 759;

export const KEYBOARD_SHORTCUTS = {
  // add shortcuts here
  // example
  toggleOmniSearch: { id: 'toggleOmniSearch', keys: ['meta', 'k'] },
} as const;

export const WORKSPACE_STORAGE_TYPE = {
  Help: 'helpfs',
  NativeFS: 'nativefs',
  Browser: 'browser',
  // See https://webkit.org/blog/12257/the-file-system-access-api-with-origin-private-file-system/
  // is supported by Safari and Chrome. It is similar to nativefs in API (not verified, there might be differences)
  // but provides a private directory to each origin.
  PrivateFS: 'privatefs',
  Github: 'github-storage',
  Memory: 'memory',
} as const;

export type WorkspaceStorageType =
  (typeof WORKSPACE_STORAGE_TYPE)[keyof typeof WORKSPACE_STORAGE_TYPE];

export * from './command';
export * from './browser-history-events';
export * from './theme';
export * from './routes';
