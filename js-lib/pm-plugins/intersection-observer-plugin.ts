import type { EditorView, PluginKey } from '@bangle.dev/pm';
import { Plugin } from '@bangle.dev/pm';

const positionMap = new WeakMap<Element, number>();
const intersectionMap = new WeakMap<Element, number>();

var lastTime = 0;

const safeRequestAnimationFrame =
  typeof window !== 'undefined' && window.requestAnimationFrame
    ? window.requestAnimationFrame
    : function (callback: (n: number) => void) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function () {
          callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;

        return id;
      };

const safeCancelAnimationFrame =
  typeof window !== 'undefined' && window.cancelAnimationFrame
    ? window.cancelAnimationFrame
    : function (id: number) {
        clearTimeout(id);
      };

export interface IntersectionObserverPluginState {
  minStartPosition: number;
  maxStartPosition: number;
}
/**
 * A plugin watches when children of doc comes into view using
 * root document and
 * called the `onIntersection` whenever intersection changes
 */
export function intersectionObserverPlugin({
  pluginKey,
  intersectionObserverOpts,
}: {
  pluginKey: PluginKey<IntersectionObserverPluginState>;
  intersectionObserverOpts: IntersectionObserverInit;
}) {
  return new Plugin<IntersectionObserverPluginState>({
    key: pluginKey,

    state: {
      init(_, state) {
        return {
          minStartPosition: 0,
          maxStartPosition: state.doc.content.size,
        };
      },

      apply(tr, oldPluginState, oldState, newState) {
        const meta = tr.getMeta(pluginKey) as IntersectionObserverPluginState;

        if (meta) {
          let { minStartPosition: minPosition, maxStartPosition: maxPosition } =
            meta;
          minPosition = Math.max(0, meta.minStartPosition);
          maxPosition = Math.min(
            newState.doc.content.size,
            meta.maxStartPosition,
          );

          // preserve instance
          if (
            minPosition === oldPluginState.minStartPosition &&
            maxPosition === oldPluginState.maxStartPosition
          ) {
            return oldPluginState;
          }

          return {
            minStartPosition: Math.max(0, meta.minStartPosition),
            maxStartPosition: Math.min(
              newState.doc.content.size,
              meta.maxStartPosition,
            ),
          };
        }

        return oldPluginState;
      },
    },

    view(editorView) {
      if (typeof window === 'undefined') {
        return {};
      }
      let observingSet = new Set<Element>();

      let prevDispatched: IntersectionObserverPluginState | undefined;
      const calcPosition = () => {
        let state: IntersectionObserverPluginState = {
          minStartPosition: editorView.state.doc.content.size,
          maxStartPosition: 0,
        };
        let intersection = 0;

        observingSet.forEach((element) => {
          const pos = positionMap.get(element);
          const ratio = intersectionMap.get(element);

          if (typeof ratio === 'number' && ratio > 0) {
            intersection++;

            if (typeof pos === 'number') {
              if (pos < state.minStartPosition) {
                state.minStartPosition = pos;
              }
              if (pos > state.maxStartPosition) {
                state.maxStartPosition = pos;
              }
            }
          }
        });

        const stateSame =
          prevDispatched &&
          prevDispatched.maxStartPosition === state.maxStartPosition &&
          prevDispatched.minStartPosition === state.minStartPosition;

        if (intersection > 0 && !stateSame) {
          editorView.dispatch(editorView.state.tr.setMeta(pluginKey, state));
          prevDispatched = state;
        }
      };

      const intersectionCallback: IntersectionObserverCallback = (
        entries,
        observer,
      ) => {
        if ((editorView as any).isDestroyed) {
          return;
        }

        entries.forEach((entry) => {
          intersectionMap.set(entry.target, entry.intersectionRatio);
        });

        calcPosition();
      };

      let observer: IntersectionObserver | undefined =
        isIntersectionAPIAvailable()
          ? new IntersectionObserver(
              intersectionCallback,
              intersectionObserverOpts,
            )
          : undefined;

      let updateNodes = () => {
        // console.time('start');
        const newObserving = getDocsChildren(editorView);
        // console.timeEnd('start');

        observingSet.forEach((node) => {
          if (!newObserving.has(node)) {
            observer?.unobserve(node);
          }
        });

        newObserving.forEach((node) => {
          if (!observingSet.has(node)) {
            observer?.observe(node);
          }
        });

        observingSet = newObserving;
        calcPosition();
      };

      let raf: number | null = null;

      return {
        destroy() {
          if (raf !== null) {
            cancelAnimationFrame(raf);
          }
          observer?.disconnect();
          observingSet.clear();
        },
        update(view, lastState) {
          const { state } = view;

          if (lastState === state) {
            return;
          }
          if (raf !== null) {
            safeCancelAnimationFrame(raf);
          }
          raf = safeRequestAnimationFrame(updateNodes);
        },
      };
    },
  });
}

// copied from https://github.com/prosemirror/prosemirror-view/blob/f667684bf9c8a0ef0c830219b7a9f91bf1da4ce9/src/viewdesc.js#L253
// needed this over the regular .nodeDOM api for performance reasons
export function getDocsChildren(view: EditorView): Set<Element> {
  const viewDesc = (view as any).docView;
  let list1: Set<Element> = new Set();
  for (let i = 0, offset = 0; i < viewDesc.children.length; i++) {
    let child = viewDesc.children[i];
    while (!child.border && child.children.length) {
      child = child.children[0];
    }
    const node = child.nodeDOM;

    if (node instanceof Element) {
      positionMap.set(node, offset);
      list1.add(node);
    }
    offset = offset + child.size;
  }

  return list1;
}

function isIntersectionAPIAvailable() {
  if (typeof window !== 'undefined') {
    if ('IntersectionObserver' in window) {
      return true;
    }
  }

  return false;
}
