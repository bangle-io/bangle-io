import type { Logger } from '@bangle.io/logger';
import {
  defaultCalculateNodeOffset,
  type LinkConfig,
  setupActiveNode,
  setupBase,
  setupBlockquote,
  setupBold,
  setupCode,
  setupCodeBlock,
  setupCollapsibleHeading,
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
  setupTable,
  setupTableMenu,
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
      // 'table': the flash animation re-triggers on every cell move and makes
      // rows appear to blink while navigating with arrow keys.
      excludedNodes: ['horizontal_rule', 'code_block', 'blockquote', 'table'],
    }),
    base: setupBase(),
    blockquote: setupBlockquote(),
    bold: setupBold(),
    list: setupList(),

    dragNode: setupDragNode({
      pluginOptions: {
        notDraggableClassName: 'prosemirror-flat-list',
        excludedTags: ['blockquote'],
        calculateNodeOffset: (args) => {
          const rect = defaultCalculateNodeOffset(args);
          // Headings host the fold toggle in the gutter slot next to the
          // text; move the drag handle one slot further left.
          if (args.node.matches('h1, h2, h3, h4, h5, h6')) {
            rect.left -= 24;
          }
          return rect;
        },
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
    collapsibleHeading: setupCollapsibleHeading({
      collapseLabel: t.app.editor.collapsibleHeading.collapse,
      expandLabel: t.app.editor.collapsibleHeading.expand,
    }),
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
    table: setupTable(),
    tableMenu: setupTableMenu(),
  };
}
