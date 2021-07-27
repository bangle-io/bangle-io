import {
  blockquote,
  bold,
  bulletList,
  code,
  codeBlock,
  hardBreak,
  heading,
  horizontalRule,
  italic,
  link,
  listItem,
  orderedList,
  paragraph,
  strike,
  history,
  underline,
} from '@bangle.dev/base-components';
import { NodeSelection, Plugin, PluginKey } from '@bangle.dev/pm';
import { floatingMenu } from '@bangle.dev/react-menu';
import { stopwatch } from '@bangle.dev/react-stopwatch';
import { tablePlugins } from '@bangle.dev/table';
import { timestamp } from '@bangle.dev/timestamp';
import { trailingNode } from '@bangle.dev/trailing-node';

export const menuKey = new PluginKey('menuKey');

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

const { queryIsSelectionAroundLink, queryIsLinkActive } = link;
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
        toH4: null,
        toH5: null,
        toH6: null,
      },
    }),
    horizontalRule.plugins(),
    listItem.plugins(),
    orderedList.plugins(),
    history.plugins(),
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
