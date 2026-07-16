import {
  markdownLoader,
  resolve,
  Schema,
  setupBase,
  setupBlockquote,
  setupBold,
  setupCode,
  setupCodeBlock,
  setupFrontmatter,
  setupHardBreak,
  setupHeading,
  setupHorizontalRule,
  setupImage,
  setupItalic,
  setupLink,
  setupList,
  setupMath,
  setupParagraph,
  setupStrike,
  setupTable,
  setupWikiLink,
} from '@bangle.io/prosemirror-plugins';

/**
 * Markdown-relevant subset of the current ProseMirror editor's production
 * extension set. Keep registration order aligned with `setupExtensions` so
 * schema mark rank and serializer behavior match the application.
 */
export function createProductionMarkdown() {
  const extensions = [
    setupBase({ docContent: 'frontmatter? block+' }),
    setupFrontmatter(),
    setupBlockquote(),
    setupBold(),
    setupList(),
    setupMath(),
    setupHardBreak(),
    setupHeading(),
    setupParagraph(),
    setupStrike(),
    setupWikiLink(),
    setupHorizontalRule(),
    setupCode(),
    setupCodeBlock(),
    setupItalic(),
    setupLink(),
    setupImage(),
    setupTable(),
  ];
  const resolved = resolve(extensions);
  const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
  return { schema, ...markdownLoader(extensions, schema) };
}
