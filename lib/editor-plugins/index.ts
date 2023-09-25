import {
  blockquote,
  bold,
  bulletList,
  code,
  codeBlock,
  hardBreak,
  heading,
  history,
  horizontalRule,
  italic,
  link,
  listItem,
  orderedList,
  paragraph,
  strike,
  underline,
} from '@bangle.dev/base-components';
import type { EditorView } from '@bangle.dev/pm';
import { keymap, NodeSelection, Plugin } from '@bangle.dev/pm';
import { floatingMenu } from '@bangle.dev/react-menu';
import { tablePlugins } from '@bangle.dev/table';
import { timestamp } from '@bangle.dev/timestamp';
import { trailingNode } from '@bangle.dev/trailing-node';

import {
  intersectionObserverPluginKey,
  menuKey,
} from '@bangle.io/editor-common';
import { intersectionObserverPlugin } from '@bangle.io/pm-plugins';
import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

import { activeNode } from './active-node';
import { collabPlugin } from './collab-plugin';
import { collapsibleHeading } from './collapsible-heading-deco';
import { editingAllowedPlugin } from './editing-allowed';
import { searchPlugin } from './search';
import { watchEditorFocus } from './watch-editor-focus';

const getScrollContainer = (view: EditorView) => {
  return view.dom.parentElement!;
};

const { queryIsSelectionAroundLink, queryIsLinkActive } = link;

export const getPlugins = () => {
  // Plugins should not be run in workers
  assertNonWorkerGlobalScope();

  const bdDevPlugins = [
    bold.plugins(),
    code.plugins(),
    italic.plugins(),
    strike.plugins(),
    link.plugins(),
    underline.plugins(),
    paragraph.plugins(),
    blockquote.plugins(),
    bulletList.plugins(),
    codeBlock.plugins(),
    hardBreak.plugins(),
    heading.plugins({
      keybindings: {
        ...heading.defaultKeys,
        toggleCollapse: 'Shift-Meta-1',
        toH4: undefined,
        toH5: undefined,
        toH6: undefined,
      },
    }),
    horizontalRule.plugins(),
    listItem.plugins(),
    orderedList.plugins(),
    history.plugins(),
    tablePlugins(),
  ];

  return [
    typeof window !== 'undefined' &&
      intersectionObserverPlugin({
        pluginKey: intersectionObserverPluginKey,
        intersectionObserverOpts: {
          root: window.document.body,
          rootMargin: '0px',
          threshold: 0,
        },
      }),
    floatingMenu.plugins({
      key: menuKey,
      tooltipRenderOpts: {
        getScrollContainer,
      },
      calculateType: (state, prevType) => {
        if (state.selection instanceof NodeSelection) {
          return null;
        }
        if (queryIsSelectionAroundLink()(state) || queryIsLinkActive()(state)) {
          return 'linkSubMenu';
        }
        if (state.selection.empty) {
          return null;
        }

        return 'defaultMenu';
      },
    }),

    ...bdDevPlugins,
    // stopwatch.plugins(),
    trailingNode.plugins(),
    timestamp.plugins(),
    new Plugin({
      props: {
        // This is needed by jumping to a heading to atleast show up
        // in the middle of screen.
        // TODO the /4 value makes it a bit weird when moving a node up
        // or down.
        scrollMargin: Math.floor(window.innerHeight / 4),
      },
    }),
    activeNode(),
    editingAllowedPlugin,
    watchEditorFocus,
    blockKeyPresses(),
    collabPlugin,
    collapsibleHeading(),
    searchPlugin(),
  ];
};

/**
 * Prevents tab presses going out of editor
 */
export function blockKeyPresses() {
  return keymap({
    'Tab': (state) => {
      return true;
    },
    'Meta-s': (state) => {
      return true;
    },
  });
}
