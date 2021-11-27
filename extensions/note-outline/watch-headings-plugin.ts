import type { EditorState, StateField } from '@bangle.dev/pm';
import { Plugin } from '@bangle.dev/pm';

import { debounceFn } from '@bangle.io/utils';

import {
  HeadingNodes,
  WATCH_HEADINGS_PLUGIN_DEBOUNCE_MAX_WAIT,
  WATCH_HEADINGS_PLUGIN_DEBOUNCE_WAIT,
  watchHeadingsPluginKey,
  WatchPluginState,
} from './config';

export function watchHeadingsPlugin() {
  let state: StateField<WatchPluginState> = {
    init(_, state) {
      return {
        headings: getHeadings(state),
      };
    },
    apply(tr, old, oldState, newState) {
      const meta = tr.getMeta(watchHeadingsPluginKey);
      if (meta) {
        return {
          ...old,
          headings: getHeadings(newState),
        };
      }
      return old;
    },
  };

  return new Plugin({
    key: watchHeadingsPluginKey,
    state,
    view(view) {
      let calculateHeadings = debounceFn(
        () => {
          if (!(view as any).isDestroyed && view.hasFocus()) {
            view.dispatch(view.state.tr.setMeta(watchHeadingsPluginKey, true));
          }
        },
        {
          wait: WATCH_HEADINGS_PLUGIN_DEBOUNCE_WAIT,
          maxWait: WATCH_HEADINGS_PLUGIN_DEBOUNCE_MAX_WAIT,
        },
      );

      return {
        update(view, lastState) {
          const { state } = view;

          if (lastState === state) {
            return;
          }
          if (
            state.doc.eq(lastState.doc) &&
            state.selection.eq(lastState.selection)
          ) {
            return;
          }

          calculateHeadings();
        },
        destroy() {
          calculateHeadings.cancel();
        },
      };
    },
  });
}

function getHeadings(state: EditorState) {
  let headingNodes: HeadingNodes = [];
  let closestHeadingDiff = Infinity;
  const { from } = state.selection;

  state.doc.forEach((node, offset, i) => {
    if (node.type.name === 'heading') {
      let diff = from - offset;
      if (diff >= 0 && diff < closestHeadingDiff) {
        closestHeadingDiff = diff;
      }
      headingNodes.push({
        offset,
        level: node.attrs.level,
        title: node.textContent,
        isActive: false,
      });
    }
  });

  if (closestHeadingDiff !== Infinity) {
    const closestHeading = headingNodes.find(
      (h) => closestHeadingDiff === from - h.offset,
    );
    if (closestHeading) {
      closestHeading.isActive = true;
    }
  }

  return headingNodes;
}
