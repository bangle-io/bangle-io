import type { EditorState, StateField } from '@bangle.dev/pm';
import { Plugin } from '@bangle.dev/pm';

import { debounceFn } from '@bangle.io/utils';

import type { HeadingNodes, WatchPluginState } from './config';
import {
  WATCH_HEADINGS_PLUGIN_DEBOUNCE_MAX_WAIT,
  WATCH_HEADINGS_PLUGIN_DEBOUNCE_WAIT,
  watchHeadingsPluginKey,
} from './config';
import { getEditorIntersectionObserverPluginState } from './helpers';

export function watchHeadingsPlugin() {
  let state: StateField<WatchPluginState> = {
    init(_, state) {
      const intersectionState = getEditorIntersectionObserverPluginState(state);

      if (!intersectionState) {
        console.warn(
          'note-outline expects editorIntersectionObserverPluginState',
        );
      }

      return {
        headings: getHeadings(state, intersectionState),
      };
    },
    apply(tr, old, oldState, newState) {
      const meta = tr.getMeta(watchHeadingsPluginKey);
      const intersectionState =
        getEditorIntersectionObserverPluginState(newState);

      const intersectionChanged =
        intersectionState !==
        getEditorIntersectionObserverPluginState(oldState);

      if (meta || intersectionChanged) {
        return {
          ...old,
          headings: getHeadings(newState, intersectionState),
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

export function getHeadings(
  state: EditorState,
  intersectionState?: ReturnType<
    typeof getEditorIntersectionObserverPluginState
  >,
): HeadingNodes {
  const headingNodes: HeadingNodes = [];

  state.doc.forEach((node, offset, i) => {
    if (node.type.name === 'heading') {
      const intersecting = isPositionInsideIntersection(
        offset,
        intersectionState,
      );

      const result = {
        offset,
        level: node.attrs.level,
        title: node.textContent,
        isActive: false,
        hasContentInsideViewport: intersecting,
      };

      headingNodes.push(result);
    }
  });

  // Set active heading based on selection
  const nearestActiveHeading = findLeftNearestHeading(
    state.selection.from,
    headingNodes,
  );

  if (nearestActiveHeading) {
    nearestActiveHeading.isActive = true;
  }

  if (intersectionState) {
    const hasIntersecting = headingNodes.some(
      (r) => r.hasContentInsideViewport,
    );

    // if no intersections we have to approximate the best
    // available heading
    if (!hasIntersecting) {
      // find the closest heading before the minStartPosition
      const nearestNode = findLeftNearestHeading(
        intersectionState.minStartPosition,
        headingNodes,
      );

      if (nearestNode) {
        nearestNode.hasContentInsideViewport = true;
      }
    }
  }

  return headingNodes;
}

/**
 * Finds the nearest heading (from left aka before) from the given position
 */
function findLeftNearestHeading(
  position: number,
  headingNodes: HeadingNodes,
): HeadingNodes[0] | undefined {
  let closestHeadingDiff = Infinity;
  // this is the heading that is the nearest (before)
  // the where the current selection from is.
  // If its a paragraph its first heading appearing before it
  // if it is a heading it is itself
  let closestHeading: HeadingNodes[0] | undefined = undefined;

  for (const heading of headingNodes) {
    let diff = position - heading.offset;

    if (diff >= 0 && diff < closestHeadingDiff) {
      closestHeadingDiff = diff;
      closestHeading = heading;
    }

    // no point in going through headings
    // that are after the given position as
    // we only care about headings before it.
    if (diff < 0) {
      break;
    }
  }

  return closestHeading;
}

function isPositionInsideIntersection(
  pos: number,
  intersectionState: ReturnType<
    typeof getEditorIntersectionObserverPluginState
  >,
) {
  if (!intersectionState) {
    return false;
  }

  return (
    pos >= intersectionState.minStartPosition &&
    pos <= intersectionState.maxStartPosition
  );
}
