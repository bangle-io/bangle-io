import type { Logger } from '@bangle.io/logger';
import {
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
  setupFrontmatter,
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
import {
  type AssetFilePluginConfig,
  setupAssetFilePlugin,
} from './asset-file-plugin';
import {
  type AssetLinkPluginConfig,
  setupAssetLinkPlugin,
} from './asset-link-plugin';
import { setupCodeHighlight } from './code-highlight';
import { funPlaceholder } from './utils';

/**
 * The date picker is a first-class suggestion surface: `$date` is a real
 * typed trigger, and the slash menu's "Date" item swaps the slash mark for
 * this trigger text so both paths converge on the same suggestion mark.
 */
export const DATE_SUGGESTION = {
  markName: 'date_suggestion',
  trigger: '$date',
} as const;

export function setupExtensions(
  logger: Logger,
  onOpenLink?: LinkConfig['onOpenLink'],
  wikiLinkConfig?: WikiLinkConfig,
  assetFileConfig?: AssetFilePluginConfig,
  assetLinkConfig?: AssetLinkPluginConfig,
) {
  const link = setupLink({ onOpenLink });
  return {
    image: setupImage(),
    ...(assetFileConfig
      ? { assetFilePlugin: setupAssetFilePlugin(assetFileConfig) }
      : {}),
    ...(assetLinkConfig
      ? { assetLinkPlugin: setupAssetLinkPlugin(assetLinkConfig) }
      : {}),
    activeNode: setupActiveNode({
      // 'table': the flash animation re-triggers on every cell move and makes
      // rows appear to blink while navigating with arrow keys.
      excludedNodes: [
        'horizontal_rule',
        'code_block',
        'frontmatter',
        'blockquote',
        'table',
      ],
    }),
    // A single YAML frontmatter block may sit above the body; the doc content
    // expression is what enforces "at most one, only at the top".
    base: setupBase({ docContent: 'frontmatter? block+' }),
    frontmatter: setupFrontmatter(),
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
    dateSuggestions: setupSuggestions({
      providerId: 'date-picker',
      markName: DATE_SUGGESTION.markName,
      trigger: DATE_SUGGESTION.trigger,
      markClassName: 'text-pop',
      // The suggestion keymap is installed once by the slash-command
      // provider and dispatches by mark name, same as wikiSuggestions.
      installKeymap: false,
      logger: logger.child('date-suggestions'),
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
