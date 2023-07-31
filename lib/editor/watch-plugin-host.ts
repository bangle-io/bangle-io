import { Plugin, PluginKey } from '@bangle.dev/pm';

import { hasPluginStateChanged } from '@bangle.io/editor-common/helpers';
import type {
  EditorPluginMetadata,
  EditorWatchPluginState,
  SerialOperationNameType,
} from '@bangle.io/shared-types';
import {
  debounceFn,
  safeCancelIdleCallback,
  safeRequestIdleCallback,
} from '@bangle.io/utils';

import { EDITOR_WATCH_PLUGIN_HOST_WAIT_TIME } from './config';

/**
 * Connects the rest of the app by monitor provided plugins state changes
 * and dispatching operation when that happens.
 *
 * Does not guarantee an operation dispatch for every single plugin state.
 * Consecutive state updates can be batched resulting in a single operation dispatch.
 */
export function watchPluginHost(
  editorPluginMetadata: EditorPluginMetadata,
  watchPluginStates: EditorWatchPluginState[],
) {
  const key = new PluginKey<Set<SerialOperationNameType>>(
    'editor_watchPluginHost',
  );

  return new Plugin({
    key,
    state: {
      init() {
        return new Set<SerialOperationNameType>();
      },
      apply(tr, old, oldState, newState) {
        // We only care about plugin state
        for (const { pluginKey, operation } of watchPluginStates) {
          if (hasPluginStateChanged(pluginKey, newState, oldState)) {
            old.add(operation);
          }
        }

        return old;
      },
    },
    view(view) {
      let pendingTimer = 0;

      const runner = debounceFn(
        () => {
          safeCancelIdleCallback(pendingTimer);
          pendingTimer = safeRequestIdleCallback(
            () => {
              const state = view.state;
              const pluginState = key.getState(state);

              if (pluginState && pluginState.size > 0) {
                pluginState.forEach((operation) => {
                  // Avoid sending any thing related to editor instance
                  // which can cause memory leak, only send primitives
                  editorPluginMetadata.dispatchSerialOperation({
                    name: operation,
                    value: {
                      editorId: editorPluginMetadata.editorId,
                    },
                  });
                });
                pluginState.clear();
              }
            },
            { timeout: 2 * EDITOR_WATCH_PLUGIN_HOST_WAIT_TIME },
          );
        },
        {
          wait: EDITOR_WATCH_PLUGIN_HOST_WAIT_TIME,
          maxWait: 2 * EDITOR_WATCH_PLUGIN_HOST_WAIT_TIME,
        },
      );

      return {
        destroy() {
          runner.cancel();
          safeCancelIdleCallback(pendingTimer);
        },
        update(view, lastState) {
          const { state } = view;

          if (lastState === state) {
            return;
          }

          runner();
        },
      };
    },
  });
}
