import { collection } from '../common';
import type { setupLink } from '../link';
import { type Command, Plugin, PluginKey } from '../pm';
import {
  clampRange,
  createVirtualElementFromRange,
  setupScrollAndResizeHandlers,
  type VirtualElement,
} from '../pm-utils';
import { store } from '../store';

type LinkMenuOptions = {
  link: ReturnType<typeof setupLink>;
};

export type LinkMenuState = {
  show: boolean;
  position: number;
  href: string;
  anchorEl: () => VirtualElement | null;
  refresh: number;
};

// Internal mutable atom
const $internalLinkMenu = store.atom<LinkMenuState | undefined>(undefined);

export const $linkMenu = store.atom((get) => get($internalLinkMenu));

/**
 * This plugin checks if the selection is empty and inside a link,
 * then sets our $linkMenu atom so the floating menu can appear.
 */
function linkMenuPlugin(options: LinkMenuOptions) {
  const pluginKey = new PluginKey('link-menu');

  return new Plugin({
    key: pluginKey,
    view: (view) => {
      const abortController = new AbortController();

      setupScrollAndResizeHandlers((refresh_counter) => {
        const linkMenu = store.get(view.state, $internalLinkMenu);
        if (linkMenu) {
          store.set(view.state, $internalLinkMenu, {
            ...linkMenu,
            refresh: refresh_counter,
          });
        }
      }, abortController.signal);

      return {
        destroy: () => {
          abortController.abort();
        },
        update: (view, prevState) => {
          const { state } = view;
          // If doc + selection hasn't changed, do nothing.
          if (
            prevState.doc?.eq(state.doc) &&
            prevState.selection.eq(state.selection)
          ) {
            return;
          }

          // We only show the menu if the selection is empty & inside a link mark.
          if (!state.selection.empty) {
            store.set(state, $internalLinkMenu, undefined);
            return;
          }

          const linkActive = options.link.query.isLinkActive(state);
          if (!linkActive) {
            store.set(state, $internalLinkMenu, undefined);
            return;
          }

          console.log('linkActive', linkActive);
          // Find the link mark, get its href.
          const linkType = options.link.query.getLinkMark(state);
          const $pos = state.selection.$from;
          const mark = linkType.isInSet($pos.marks());
          if (!mark) {
            store.set(state, $internalLinkMenu, undefined);
            return;
          }

          const href = mark.attrs.href ?? '';
          const startPos = $pos.pos;

          const anchorElFn = () => {
            const [start, end] = clampRange(
              startPos,
              startPos + 1,
              view.state.doc.content.size,
            );
            return createVirtualElementFromRange(view, start, end);
          };

          store.set(state, $internalLinkMenu, {
            show: true,
            position: startPos,
            href,
            anchorEl: anchorElFn,
            refresh: store.get(state, $internalLinkMenu)?.refresh ?? 0,
          });
        },
      };
    },
  });
}

/**
 * Main setup function for the link-menu collection
 */
export function setupLinkMenu(options: LinkMenuOptions) {
  const plugin = {
    linkMenu: linkMenuPlugin(options),
  };

  return collection({
    id: 'link-menu',
    plugin,

    command: {
      dismissLinkMenu,
    },

    $linkMenu,
  });
}

// COMMANDS
function dismissLinkMenu(): Command {
  return (state) => {
    store.set(state, $internalLinkMenu, undefined);
    return true;
  };
}
