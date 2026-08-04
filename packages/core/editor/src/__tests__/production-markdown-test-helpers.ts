import {
  AllSelection,
  type Command,
  EditorState,
  markdownLoader,
  type PMNode,
  type PMSelection,
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
  TextSelection,
} from '@bangle.io/prosemirror-plugins';

/**
 * Markdown-relevant subset of the current ProseMirror editor's production
 * extension set. Keep registration order aligned with `setupExtensions` so
 * schema mark rank and serializer behavior match the application.
 */
function createProductionMarkdownExtensions() {
  return [
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
}

export function createProductionMarkdown() {
  const extensions = createProductionMarkdownExtensions();
  const resolved = resolve(extensions);
  const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
  return {
    extensions,
    resolved,
    schema,
    ...markdownLoader(extensions, schema),
  };
}

/**
 * Runs editor commands against the production Markdown pipeline: parse a
 * document, place a selection in it by naming the text, run the command, and
 * read the Markdown back out.
 *
 * Selections are addressed by text rather than by position so a test reads as
 * the edit a user would make, and stays put when surrounding content changes.
 */
export function createMarkdownHarness() {
  const markdown = createProductionMarkdown();

  const parse = (source: string) => markdown.parser.parse(source);

  /** Offset of `text` within the document, or throws if it is not there. */
  const findText = (doc: PMNode, text: string, offset: number) => {
    let pos = -1;
    doc.descendants((node, nodePos) => {
      if (pos === -1 && node.isText && node.text?.includes(text)) {
        pos = nodePos + node.text.indexOf(text) + offset;
      }
    });
    if (pos === -1) {
      throw new Error(`No text "${text}" in the parsed document`);
    }
    return pos;
  };

  const stateWith = (doc: PMNode, selection: PMSelection) =>
    EditorState.create({ doc, schema: markdown.schema, selection });

  return {
    markdown,

    /** Caret immediately after the first occurrence of `text`. */
    caretAfter(source: string, text: string) {
      const doc = parse(source);
      return stateWith(
        doc,
        TextSelection.create(doc, findText(doc, text, text.length)),
      );
    },

    /** Selection running from the start of `from` to the end of `to`. */
    rangeOver(source: string, from: string, to: string) {
      const doc = parse(source);
      return stateWith(
        doc,
        TextSelection.create(
          doc,
          findText(doc, from, 0),
          findText(doc, to, to.length),
        ),
      );
    },

    /** The whole document selected, as a toolbar action on a full selection. */
    selectAll(source: string) {
      const doc = parse(source);
      return stateWith(doc, new AllSelection(doc));
    },

    apply(state: EditorState, command: Command) {
      let next = state;
      command(state, (tr) => {
        next = state.apply(tr);
      });
      return next;
    },

    serialize: (state: EditorState) => markdown.serializer.serialize(state.doc),

    /** Markdown of `source` after a parse/serialize round trip. */
    reserialize: (source: string) =>
      markdown.serializer.serialize(parse(source)),
  };
}
