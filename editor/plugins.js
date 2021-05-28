import { uuid } from '@bangle.dev/core/utils/js-utils';
import {
  queryIsSelectionAroundLink,
  queryIsLinkActive,
} from '@bangle.dev/core/components/link';
import {
  Plugin,
  PluginKey,
  NodeSelection,
} from '@bangle.dev/core/prosemirror/state';
import { collabClient } from '@bangle.dev/collab-client';
import { components } from '@bangle.dev/core';
import { trailingNode } from '@bangle.dev/trailing-node';
import { timestamp } from '@bangle.dev/timestamp';
import stopwatch from '@bangle.dev/react-stopwatch';
import { floatingMenu } from '@bangle.dev/react-menu';
import { tablePlugins } from '@bangle.dev/table';
export const menuKey = new PluginKey('menuKey');

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

export const getPlugins = (wsPath, sendRequest) => {
  const collabOpts = {
    docName: wsPath,
    clientId: 'client-' + uuid(4),
    async getDocument({ docName, userId }) {
      // log({ docName, userId });
      return sendRequest('get_document', {
        docName,
        userId,
      });
    },

    async pullEvents({ version, docName, userId }) {
      // log({ version, docName, userId });
      return sendRequest('pull_events', {
        docName,
        version,
        userId,
      });
    },

    async pushEvents({ version, steps, clientID, docName, userId }) {
      // log({ version, steps, clientID, docName, userId });
      return sendRequest('push_events', {
        clientID,
        version,
        steps,
        docName,
        userId,
      });
    },
  };

  return () => [
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
    collabClient.plugins(collabOpts),

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
