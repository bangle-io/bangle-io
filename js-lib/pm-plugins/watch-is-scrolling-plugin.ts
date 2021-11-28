import debounceFn from 'debounce-fn';

import { EditorView, Plugin, PluginKey } from '@bangle.dev/pm';

const LOG = false;
let log = LOG
  ? console.log.bind(console, 'watch-is-scrolling-plugin')
  : () => {};

const SCROLL_START_WAIT = 30;
const SCROLL_START_MAX_WAIT = 100;

const SCROLL_STOP_WAIT = 100;
const SCROLL_STOP_MAX_WAIT = 2500;

export interface WatchIsScrollingPluginState {
  isScrolling: boolean;
}
export function watchIsScrollingPlugin({
  pluginKey,
  getScrollParent,
}: {
  pluginKey: PluginKey<WatchIsScrollingPluginState>;
  getScrollParent: (view: EditorView) => Element | undefined;
}) {
  return new Plugin<WatchIsScrollingPluginState>({
    key: pluginKey,
    state: {
      init(_, state) {
        return {
          isScrolling: false,
        };
      },
      apply(tr, old, oldState, newState) {
        const meta = tr.getMeta(pluginKey) as WatchIsScrollingPluginState;
        if (meta && meta.isScrolling !== old.isScrolling) {
          return {
            ...old,
            isScrolling: meta.isScrolling,
          };
        }

        return old;
      },
    },
    view(editorView) {
      const scrollableParent = getScrollParent(editorView);

      if (!scrollableParent) {
        console.warn(
          'watch-is-scrolling-plugin: Could not find a scrollable parent',
        );
        return {};
      }

      let isScrolling = false;

      const scrollStopped = debounceFn(
        () => {
          isScrolling = false;
          log('stopped scrolling');
          if (!(editorView as any).isDestroyed && editorView.hasFocus()) {
            const state: WatchIsScrollingPluginState = { isScrolling: false };
            editorView.dispatch(editorView.state.tr.setMeta(pluginKey, state));
          }
        },
        {
          wait: SCROLL_STOP_WAIT,
          maxWait: SCROLL_STOP_MAX_WAIT,
        },
      );

      const scrollStarted = debounceFn(
        () => {
          isScrolling = true;
          log('started scrolling');
          if (!(editorView as any).isDestroyed && editorView.hasFocus()) {
            const state: WatchIsScrollingPluginState = { isScrolling: true };
            editorView.dispatch(editorView.state.tr.setMeta(pluginKey, state));
          }
          scrollStopped();
        },
        {
          wait: SCROLL_START_WAIT,
          maxWait: SCROLL_START_MAX_WAIT,
          before: true,
        },
      );

      const deb = () => {
        if (!isScrolling) {
          scrollStarted();
        }
      };

      const opts = {
        capture: true,
        passive: true,
      };

      scrollableParent.addEventListener('scroll', deb, opts);

      return {
        destroy: () => {
          scrollableParent.removeEventListener('scroll', deb, opts);
          scrollStarted.cancel();
          scrollStopped.cancel();
        },
      };
    },
  });
}
