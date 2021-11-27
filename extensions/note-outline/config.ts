import type { EditorState } from '@bangle.dev/pm';
import { PluginKey } from '@bangle.dev/pm';

export const watchHeadingsPluginKey = new PluginKey<WatchPluginState>(
  'note-outline_watchHeadingsPluginKey',
);

export type HeadingNodes = Array<{
  offset: number;
  level: number;
  title: string;
  isActive: boolean;
}>;

export interface WatchPluginState {
  headings?: HeadingNodes;
}

export const WATCH_HEADINGS_PLUGIN_DEBOUNCE_WAIT = 100;
export const WATCH_HEADINGS_PLUGIN_DEBOUNCE_MAX_WAIT = 1500;
export const WATCH_HEADINGS_PLUGIN_STATE_UPDATE_ACTION =
  'action::note-outline:watch-headings-plugin-state-update';

export function getWatchPluginState(state: EditorState) {
  return watchHeadingsPluginKey.getState(state);
}
