import type { ThemeConfig } from '@bangle.io/color-scheme-manager';

/** @public */
export type ColorScheme = 'light' | 'dark';
/** @public */
export type ThemePreference = ThemeConfig['defaultPreference'];

/** @public */
export type {
  AssetLocationPreference,
  WorkspaceStorageType,
} from '@bangle.io/constants';
/** @public */
export type * from '@bangle.io/mini-js-utils';
/** @public */
export type * from '@bangle.io/root-emitter';
/** @public */
export * from './app-errors';
/** @public */
export type * from './base-database';
/** @public */
export type * from './base-file-storage';
/** @public */
export type * from './base-router';
/** @public */
export type * from './commands';
/** @public */
export type * from './emitter';
/** @public */
export type * from './services';
/** @public */
export type * from './workspace';
