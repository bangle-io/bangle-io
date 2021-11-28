import { Plugin, PluginKey } from '@bangle.dev/pm';

import type {
  ActionNameType,
  EditorPluginMetadata,
  EditorWatchPluginState,
} from '@bangle.io/shared-types';
import {
  hasPluginStateChanged,
  safeCancelIdleCallback,
  safeRequestIdleCallback,
} from '@bangle.io/utils';

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
  const key = new PluginKey<Set<ActionNameType>>('editor_watchPluginHost');
  return new Plugin({
    key,
    state: {
      init() {
        return new Set<ActionNameType>();
      },
      apply(tr, old, oldState, newState) {
        // We only care about plugin state
        for (const { pluginKey, action } of watchPluginStates) {
          if (hasPluginStateChanged(pluginKey, newState, oldState)) {
            old.add(action);
          }
        }

        return old;
      },
    },
    view() {
      let pendingTimer = 0;

      return {
        destroy() {
          safeCancelIdleCallback(pendingTimer);
        },
        update(view, lastState) {
          const { state } = view;

          if (lastState === state) {
            return;
          }

          // Avoid dispatching immediately to let editor do its thing
          // and debounce a bit
          safeCancelIdleCallback(pendingTimer);
          pendingTimer = safeRequestIdleCallback(
            () => {
              const pluginState = key.getState(state);
              if (pluginState && pluginState?.size > 0) {
                pluginState.forEach((action) => {
                  // Avoid sending any thing related to editor instance
                  // which can cause memory leak, only send primitives
                  editorPluginMetadata.dispatchAction({
                    name: action,
                    value: {
                      editorId: editorPluginMetadata.editorId,
                    },
                  });
                });
                pluginState.clear();
              }
            },
            { timeout: EDITOR_WATCH_PLUGIN_HOST_ACTION_WAIT_TIME },
          );
        },
      };
    },
  });
}
