import type { Logger } from '@bangle.io/logger';
import {
  setupActiveNode,
  setupBase,
  setupBlockquote,
  setupBold,
  setupCode,
  setupCodeBlock,
  setupDragNode,
  setupDropGapCursor,
  setupHardBreak,
  setupHeading,
  setupHistory,
  setupHorizontalRule,
  setupImage,
  setupItalic,
  setupLink,
  setupLinkMenu,
  setupList,
  setupParagraph,
  setupPlaceholder,
  setupSelectionMenu,
  setupStrike,
  setupSuggestions,
  setupUnderline,
  setupWikiLink,
  type WikiLinkConfig,
} from '@bangle.io/prosemirror-plugins';
import { setupCodeHighlight } from './code-highlight';
import { funPlaceholder } from './utils';

type SetupExtensionsOptions = {
  image?: Parameters<typeof setupImage>[0];
  link?: Parameters<typeof setupLink>[0];
  wikiLinkConfig?: WikiLinkConfig;
};

export function setupExtensions(
  logger: Logger,
  options: SetupExtensionsOptions = {},
) {
  const link = setupLink(options.link);
  return {
    image: setupImage(options?.image),
    activeNode: setupActiveNode({
      excludedNodes: ['horizontal_rule', 'code_block', 'blockquote'],
    }),
    base: setupBase(),
    blockquote: setupBlockquote(),
    bold: setupBold(),
    list: setupList(),

    dragNode: setupDragNode({
      pluginOptions: {
        notDraggableClassName: 'prosemirror-flat-list',
        excludedTags: ['blockquote'],
      },
    }),
    dropGapCursor: setupDropGapCursor({
      dropCursorOptions: {
        color: null,
        class:
          'transition-all bg-pop border-solid border-2 border-solid border-pop rounded-sm',
      },
    }),
    hardBreak: setupHardBreak(),
    heading: setupHeading(),
    history: setupHistory(),
    paragraph: setupParagraph(),
    strike: setupStrike(),
    suggestions: setupSuggestions({
      providerId: 'slash-command',
      markName: 'slash_command',
      trigger: '/',
      markClassName: 'text-pop',
      logger: logger.child('suggestions'),
    }),
    wikiSuggestions: setupSuggestions({
      providerId: 'wiki-link',
      markName: 'wiki_link_suggestion',
      trigger: '[[',
      markClassName: 'text-primary',
      requireTriggerBoundary: false,
      installKeymap: false,
      logger: logger.child('wiki-link-suggestions'),
    }),
    wikiLink: setupWikiLink(options.wikiLinkConfig),
    underline: setupUnderline(),
    horizontalRule: setupHorizontalRule(),
    placeholder: setupPlaceholder({
      placeholder: funPlaceholder(),
    }),
    code: setupCode(),
    codeBlock: setupCodeBlock({
      keyExit: false,
    }),
    codeHighlight: setupCodeHighlight(),
    italic: setupItalic(),
    link,
    linkMenu: setupLinkMenu({ link }),
    selectionMenu: setupSelectionMenu(),
  };
}
