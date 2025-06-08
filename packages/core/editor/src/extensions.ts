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
  setupStrike,
  setupSuggestions,
  setupUnderline,
} from '@bangle.io/prosemirror-plugins';
import { funPlaceholder } from './utils';

export function setupExtensions(logger: Logger) {
  const link = setupLink();
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
      markName: 'slash_command',
      trigger: '/',
      markClassName: 'text-pop',
      logger: logger.child('suggestions'),
    }),
    underline: setupUnderline(),
    horizontalRule: setupHorizontalRule(),
    placeholder: setupPlaceholder({
      placeholder: funPlaceholder(),
    }),
    code: setupCode(),
    codeBlock: setupCodeBlock(),
    italic: setupItalic(),
    link,
    linkMenu: setupLinkMenu({ link }),
  };
}
