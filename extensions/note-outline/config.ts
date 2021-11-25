import { PluginKey } from '@bangle.dev/pm';

export const watchHeadingsPluginKey = new PluginKey(
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

export const WATCH_HEADINGS_PLUGIN_DEBOUNCE_WAIT = 700;
export const WATCH_HEADINGS_PLUGIN_DEBOUNCE_MAX_WAIT = 3000;
export const WATCH_HEADINGS_PLUGIN_STATE_UPDATE_ACTION =
  'action::note-outline:watch-headings-plugin-state-update';
