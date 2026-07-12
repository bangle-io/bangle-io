/**
 * Opinionated plug-and-play Wordgard surfaces (plans/011, M4). The shadcn
 * posture, not the tiptap posture: every export is either an extension you
 * add to YOUR `Wordgard.create` config or a React component you render in
 * YOUR tree — this package never creates, owns, or wraps an editor
 * instance, and deleting it from an app must leave a working editor.
 *
 * Division of labor for floating/menu chrome: Wordgard owns geometry and
 * lifecycle (tooltip facets, menu model), React owns content (portaled via
 * {@link TooltipHost}), and Jotai owns UI state (per-editor atoms from
 * {@link createEditorAtoms} / {@link createMenuAtoms}; the write path is
 * always "dispatch a command/transaction", never atom→editor sync).
 *
 * Bangle-free by design: wordgard is consumed only through the
 * `@bangle.io/wordgard-utils` chokepoint and user-visible strings arrive
 * via props/PhraseSets, so later extraction stays mechanical.
 */
export {
  createEditorAtoms,
  type EditorAtoms,
  type JotaiStore,
  type SelectionSummary,
  type StateQueries,
} from './bridge';
export {
  createMenuAtoms,
  type MenuAtoms,
  type ResolvedMenuButton,
  type ResolvedMenuCustom,
  type ResolvedMenuNode,
  type ResolvedMenuSeparator,
  type ResolvedMenuSubmenu,
  useResolvedMenu,
} from './resolved-menu';
export {
  createTooltipHost,
  reactTooltip,
  TooltipHost,
  type TooltipHostHandle,
} from './tooltip-host';
