/**
 * The single place in the app layer that knows which package renders the
 * editing surface. Everything else in the app interacts with the editor via
 * the `editorEngine` service slot (`EditorEngineContract`).
 *
 * Known exception to the engine-agnostic seam: the surface component itself
 * is engine-specific because it renders the engine's own overlay UI (slash
 * menu, link menu, table menu, ...). When a second engine lands
 * (plans/011-wordgard-editor-w-migration.md), this module becomes the
 * per-engine component switch.
 */
export { Editor as EditorSurface } from '@bangle.io/editor';
