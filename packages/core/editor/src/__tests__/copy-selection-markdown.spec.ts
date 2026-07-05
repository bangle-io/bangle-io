import { Logger } from '@bangle.io/logger';
import {
  EditorState,
  markdownLoader,
  resolve,
  Schema,
  TextSelection,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';
import { setupExtensions } from '../extensions';

// Mirrors the app editor setup: build the full extension set, derive the schema
// from it, and pass the same extensions to markdownLoader that the load/save
// and paste paths use.
function setup() {
  const extensions = setupExtensions(
    new Logger('test', 'error'),
    () => {},
    {
      onActivate: () => {},
      resolveTarget: () => false,
      unresolvedAriaLabel: ({ displayText }) => displayText,
    },
    {
      storeFiles: async () => [],
      cleanupStoredFiles: () => {},
      resolveAssetReference: () => undefined,
    },
    {
      openAssetLink: () => false,
    },
  );
  const resolved = resolve(extensions, false, true);
  const schema = new Schema({
    topNode: 'doc',
    nodes: resolved.nodes,
    marks: resolved.marks,
  });
  const markdown = markdownLoader([...Object.values(extensions)], schema);
  return {
    parse: (source: string) => markdown.parser.parse(source),
    insertMarkdownAtEnd: (initialSource: string, markdownText: string) => {
      const initialDoc = markdown.parser.parse(initialSource);
      const state = EditorState.create({
        doc: initialDoc,
        schema,
        selection: TextSelection.create(
          initialDoc,
          initialDoc.content.size - 1,
        ),
      });
      const parsed = markdown.parser.parse(markdownText);
      const inline =
        parsed.childCount === 1 && parsed.firstChild?.type.name === 'paragraph';
      const slice = inline
        ? parsed.slice(1, Math.max(1, parsed.content.size - 1))
        : parsed.slice(0, parsed.content.size);

      return markdown.serializer.serialize(
        state.apply(state.tr.replaceSelection(slice)).doc,
      );
    },
    serializeSelection: (source: string, from: number, to: number) =>
      markdown.serializer.serialize(
        markdown.parser.parse(source).cut(from, to),
      ),
  };
}

describe('copy selection as Markdown', () => {
  it('serializes a whole block selection', () => {
    const { parse, serializeSelection } = setup();
    const source = 'First paragraph\n\nSecond paragraph';
    const doc = parse(source);
    // Start of the second paragraph is right after the first block.
    const from = doc.child(0).nodeSize;
    const to = doc.content.size;

    expect(serializeSelection(source, from, to)).toBe('Second paragraph');
  });

  it('serializes a partial inline selection preserving marks', () => {
    const { serializeSelection } = setup();
    // "Hello " is 6 chars; content starts at position 1 inside the paragraph,
    // so the bold word spans positions 7..12.
    const source = 'Hello **world**';

    expect(serializeSelection(source, 7, 12)).toBe('**world**');
  });

  it('serializes a selection spanning a heading and a paragraph', () => {
    const { parse, serializeSelection } = setup();
    const source = '# Title\n\nBody\n\nTrailing';
    const doc = parse(source);
    // Select the heading plus the following paragraph, excluding the trailing one.
    const to = doc.child(0).nodeSize + doc.child(1).nodeSize;

    expect(serializeSelection(source, 0, to)).toBe('# Title\n\nBody');
  });
});

// The "paste from Markdown" command parses clipboard text and inserts it, then
// the save path re-serializes it. These round trips guard that parsing pasted
// Markdown does not silently reinterpret or drop content.
describe('paste from Markdown round trips', () => {
  it.each([
    ['inline bold', '**world**'],
    ['heading', '# Title'],
    ['unordered list', '- one\n\n- two'],
    ['multiple paragraphs', 'First paragraph\n\nSecond paragraph'],
  ])('preserves %s', (_label, source) => {
    const { parse, serializeSelection } = setup();
    const doc = parse(source);
    // Serializing the whole parsed document must reproduce the source.
    expect(serializeSelection(source, 0, doc.content.size)).toBe(source);
  });

  it('keeps a single pasted heading as a heading block', () => {
    const { insertMarkdownAtEnd } = setup();

    expect(insertMarkdownAtEnd('', '# Title')).toBe('# Title');
  });

  it('still inserts a single pasted paragraph inline', () => {
    const { insertMarkdownAtEnd } = setup();

    expect(insertMarkdownAtEnd('Hello', '**world**')).toBe('Hello**world**');
  });
});
