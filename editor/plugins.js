import { uuid } from '@bangle.dev/core/utils/js-utils';
import { PluginKey } from '@bangle.dev/core/prosemirror/state';
import * as collab from '@bangle.dev/collab/client/collab-extension';
import * as coreComps from '@bangle.dev/core/components/index';
import { emoji, emojisArray } from '@bangle.dev/emoji/index';
import { trailingNode } from '@bangle.dev/trailing-node';
import { timestamp } from '@bangle.dev/timestamp';
import stopwatch from '@bangle.dev/react-stopwatch';
import sticker from '@bangle.dev/react-sticker';
import { emojiSuggest } from '@bangle.dev/react-emoji-suggest';
import { floatingMenu } from '@bangle.dev/react-menu';
import { collapsibleHeadingDeco } from './collapsible-heading-deco';

export const menuKey = new PluginKey('menuKey');
export const emojiSuggestKey = new PluginKey('emojiSuggestKey');

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

export const getPlugins = ({ wsPath, sendRequest }) => {
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
      return sendRequest('get_events', {
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
    }),
    emojiSuggest.plugins({
      key: emojiSuggestKey,
      emojis: emojisArray,
      markName: 'emojiSuggest',
      tooltipRenderOpts: {
        getScrollContainer,
      },
    }),
    coreComps.bold.plugins(),
    coreComps.code.plugins(),
    coreComps.italic.plugins(),
    coreComps.strike.plugins(),
    coreComps.link.plugins(),
    coreComps.underline.plugins(),
    coreComps.paragraph.plugins(),
    coreComps.blockquote.plugins(),
    coreComps.bulletList.plugins(),
    coreComps.codeBlock.plugins(),
    coreComps.hardBreak.plugins(),
    coreComps.heading.plugins({
      keybindings: {
        ...coreComps.heading.defaultKeys,
        toggleCollapse: 'Shift-Meta-1',
        toH4: null,
        toH5: null,
        toH6: null,
      },
    }),
    coreComps.horizontalRule.plugins(),
    coreComps.listItem.plugins(),
    coreComps.orderedList.plugins(),
    coreComps.image.plugins(),
    coreComps.history.plugins(),
    collab.plugins(collabOpts),
    emoji.plugins(),
    stopwatch.plugins(),
    trailingNode.plugins(),
    timestamp.plugins(),
    sticker.plugins(),
    collapsibleHeadingDeco.plugins(),
  ];
};
