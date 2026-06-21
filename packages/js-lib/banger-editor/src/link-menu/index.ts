import { collection } from '../common';
import type { setupLink } from '../link';
import {
  type Command,
  type EditorState,
  type EditorView,
  Plugin,
  PluginKey,
} from '../pm';
import {
  createVirtualElementFromRange,
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
};

type LinkMenuStates = ReadonlyMap<EditorView, LinkMenuState>;

// Menu state is keyed by view because every editor shares the application store.
const $internalLinkMenu = store.atom<LinkMenuStates>(new Map());

export const $linkMenu = store.atom((get) => get($internalLinkMenu));

function setLinkMenuForView(
  state: EditorState,
  view: EditorView,
  value: LinkMenuState | undefined,
) {
  const current = store.get(state, $internalLinkMenu);
  if (value === undefined && !current.has(view)) {
    return;
  }

  const next = new Map(current);
  if (value) {
    next.set(view, value);
  } else {
    next.delete(view);
  }
  store.set(state, $internalLinkMenu, next);
}

/**
 * This plugin checks if the selection is empty and inside a link,
 * then sets our $linkMenu atom so the floating menu can appear.
 */
function linkMenuPlugin(options: LinkMenuOptions) {
  const pluginKey = new PluginKey('link-menu');

  return new Plugin({
    key: pluginKey,
    view: (view) => {
      const sync = () => {
        const { state } = view;

        // We only show the menu if the selection is empty & inside a link mark.
        if (!state.selection.empty) {
          setLinkMenuForView(state, view, undefined);
          return;
        }

        const range = options.link.query.getLinkRangeAtSelection(state);
        if (!range) {
          setLinkMenuForView(state, view, undefined);
          return;
        }

        const anchorEl = () =>
          createVirtualElementFromRange(view, range.from, range.to);
        if (!anchorEl()) {
          setLinkMenuForView(state, view, undefined);
          return;
        }

        setLinkMenuForView(state, view, {
          show: true,
          position: state.selection.from,
          href: range.href ?? '',
          anchorEl,
        });
      };

      sync();

      return {
        destroy: () => setLinkMenuForView(view.state, view, undefined),
        update: sync,
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
  return (state, _dispatch, view) => {
    const menus = store.get(state, $internalLinkMenu);
    const owner =
      view && view.state === state
        ? view
        : [...menus.keys()].find((candidate) => candidate.state === state);
    if (!owner || !menus.has(owner)) {
      return false;
    }
    setLinkMenuForView(state, owner, undefined);
    return true;
  };
}
