import { Plugin, PluginKey } from '@bangle.dev/pm';

import type {
  ActionNameType,
  EditorPluginMetadata,
  EditorWatchPluginState,
} from '@bangle.io/shared-types';

import { EDITOR_WATCH_PLUGIN_HOST_ACTION_WAIT_TIME } from './config';

/**
 * Connects the rest of the app by monitor provided plugins state changes
 * and dispatching action when that happens.
 *
 * Does not guarantee an action dispatch for every single plugin state.
 * Consecutive state updates can be batched resulting in a single action dispatch.
 */
export function watchPluginHost(
  editorPluginMetadata: EditorPluginMetadata,
  watchPluginStates: EditorWatchPluginState[],
) {
  return new Plugin({
    key: new PluginKey<undefined>('editor_watchPluginHost'),
    view() {
      let actionsToDispatch = new Set<ActionNameType>();

      let pendingTimer: number | undefined;

      return {
        // we do not need to clear any pending timer
        // as we donot send any editor instance information (if we did would have caused memory leaks)
        // and expect the other side to read the state on their own.
        destroy() {},
        update(view, lastState) {
          const { state } = view;

          if (lastState === state) {
            return;
          }

          for (const { pluginKey, action } of watchPluginStates) {
            const newState = pluginKey.getState(state);
            const oldState = pluginKey.getState(lastState);
            if (newState !== oldState) {
              actionsToDispatch.add(action);
            }
          }

          if (actionsToDispatch.size === 0) {
            return;
          }

          clearTimeout(pendingTimer);

          // Avoid dispatching immediately to let editor do its thing
          // and debounce a bit
          pendingTimer = setTimeout(() => {
            actionsToDispatch.forEach((action) => {
              // Avoid sending any thing related to editor instance
              // which can cause memory leak, only send primitives
              editorPluginMetadata.dispatchAction({
                name: action,
                value: {
                  editorId: editorPluginMetadata.editorId,
                },
              });
            });
            actionsToDispatch.clear();
          }, EDITOR_WATCH_PLUGIN_HOST_ACTION_WAIT_TIME);
        },
      };
    },
  });
}
