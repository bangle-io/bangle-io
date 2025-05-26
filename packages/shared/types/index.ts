import type { ThemeConfig } from '@bangle.io/color-scheme-manager';

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = ThemeConfig['defaultPreference'];

export * from './app-errors';

export type * from './base-database';
export type * from './workspace';
export type * from './base-file-storage';
export type * from '@bangle.io/mini-js-utils';
export type * from './services';
export type * from './services-setup';
export type * from './commands';
export type * from './base-router';
export type * from '@bangle.io/root-emitter';
export type { WorkspaceStorageType } from '@bangle.io/constants';
export type * from './emitter';
