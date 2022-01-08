import type { EditorState } from '@bangle.dev/pm';
import { PluginKey } from '@bangle.dev/pm';

export const watchHeadingsPluginKey = new PluginKey<WatchPluginState>(
  'note-outline_watchHeadingsPluginKey',
);

export type HeadingNodes = Array<{
  offset: number;
  level: number;
  title: string;
  // If the selection is inside the heading
  // or any nodes after the heading that are not heading
  isActive: boolean;
  // Has itself or the content below it (anything other than heading)
  // inside the viewport
  hasContentInsideViewport: boolean;
}>;

export interface WatchPluginState {
  headings?: HeadingNodes;
}

export const WATCH_HEADINGS_PLUGIN_DEBOUNCE_WAIT = 100;
export const WATCH_HEADINGS_PLUGIN_DEBOUNCE_MAX_WAIT = 250;
export const WATCH_HEADINGS_PLUGIN_STATE_UPDATE_OP =
  'operation::@bangle.io/note-outline:watch-headings-plugin-state-update';

export function getWatchPluginState(state: EditorState) {
  return watchHeadingsPluginKey.getState(state);
}
// Time to wait after a click to
// scroll to currently viewing heading.
export const HEADING_AUTO_SCROLL_INTO_VIEW_COOLDOWN = 2500;
