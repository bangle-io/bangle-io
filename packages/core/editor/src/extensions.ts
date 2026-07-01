import type { Logger } from '@bangle.io/logger';
import {
  type LinkConfig,
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
  setupTrailingNode,
  setupUnderline,
  setupWikiLink,
  type WikiLinkConfig,
} from '@bangle.io/prosemirror-plugins';
import { setupCodeHighlight } from './code-highlight';
import { funPlaceholder } from './utils';

export function setupExtensions(
  logger: Logger,
  onOpenLink?: LinkConfig['onOpenLink'],
  wikiLinkConfig?: WikiLinkConfig,
) {
  const link = setupLink({ onOpenLink });
  return {
    image: setupImage(),
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
    trailingNode: setupTrailingNode(),
    wikiSuggestions: setupSuggestions({
      providerId: 'wiki-link',
      markName: 'wiki_link_suggestion',
      trigger: '[[',
      markClassName: 'text-primary',
      requireTriggerBoundary: false,
      installKeymap: false,
      logger: logger.child('wiki-link-suggestions'),
    }),
    wikiLink: setupWikiLink(wikiLinkConfig),
    underline: setupUnderline(),
    horizontalRule: setupHorizontalRule(),
    placeholder: setupPlaceholder({
      placeholder: funPlaceholder(),
    }),
    code: setupCode(),
    codeBlock: setupCodeBlock(),
    codeHighlight: setupCodeHighlight(),
    italic: setupItalic(),
    link,
    linkMenu: setupLinkMenu({ link }),
    selectionMenu: setupSelectionMenu(),
  };
}
