/**
 * Platform-free service composition builder. Import this subpath (instead of
 * the package root) from test setup so browser-only platform modules are not
 * loaded.
 */

export type { EditorSaveCoordinator } from '@bangle.io/editor';
export { createEditorSaveCoordinator } from '@bangle.io/editor';
export type { CoreConfigOverrides } from './src/service-setup';
export { createServiceSetup } from './src/service-setup';
