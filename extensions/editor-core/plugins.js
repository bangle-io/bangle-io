import {
  queryIsSelectionAroundLink,
  queryIsLinkActive,
} from '@bangle.dev/core/components/link';
import {
  Plugin,
  PluginKey,
  NodeSelection,
} from '@bangle.dev/core/prosemirror/state';
import stopwatch from '@bangle.dev/react-stopwatch';
import { components } from '@bangle.dev/core';
import { trailingNode } from '@bangle.dev/trailing-node';
import { timestamp } from '@bangle.dev/timestamp';
import { floatingMenu } from '@bangle.dev/react-menu';
import { tablePlugins } from '@bangle.dev/table';
export const menuKey = new PluginKey('menuKey');

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

export const getPlugins = () => {
  return [
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

    components.bold.plugins(),
    components.code.plugins(),
    components.italic.plugins(),
    components.strike.plugins(),
    components.link.plugins(),
    components.underline.plugins(),
    components.paragraph.plugins(),
    components.blockquote.plugins(),
    components.bulletList.plugins(),
    components.codeBlock.plugins(),
    components.hardBreak.plugins(),
    components.heading.plugins({
      keybindings: {
        ...components.heading.defaultKeys,
        toggleCollapse: 'Shift-Meta-1',
        toH4: null,
        toH5: null,
        toH6: null,
      },
    }),
    components.horizontalRule.plugins(),
    components.listItem.plugins(),
    components.orderedList.plugins(),
    components.history.plugins(),
    tablePlugins(),
    stopwatch.plugins(),
    trailingNode.plugins(),
    timestamp.plugins(),
    new Plugin({
      props: {
        // This is needed by jumping to a heading to atleast show up
        // in the middle of screen.
        // TODO the /4 value makes it a bit weird when moving a node up
        // or down.
        scrollMargin: parseInt(window.innerHeight / 4),
      },
    }),
  ];
};
