import {
  markdownLoader,
  resolve,
  Schema,
  setupBase,
  setupParagraph,
  TextSelection,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';
import {
  getRememberedCursorPosition,
  resolveRememberedCursor,
} from '../remembered-cursor';

function parseParagraph(source: string) {
  const extensions = [setupBase(), setupParagraph()];
  const resolved = resolve(extensions);
  const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
  const doc = markdownLoader(extensions, schema).parser.parse(source);
  if (!doc) {
    throw new Error('Expected Markdown parser to return a document');
  }
  return doc;
}

describe('resolveRememberedCursor', () => {
  it('remembers the head of a text selection as its cursor position', () => {
    const doc = parseParagraph('alpha beta');
    const selection = TextSelection.create(doc, 2, 7);

    expect(getRememberedCursorPosition(selection)).toBe(7);
  });

  it('restores an unchanged text position', () => {
    const doc = parseParagraph('alpha beta');

    const selection = resolveRememberedCursor(doc, 7);

    expect(selection?.head).toBe(7);
    expect(selection?.$head.parent.textContent).toBe('alpha beta');
  });

  it('falls back to the nearest text cursor when the document became shorter', () => {
    const doc = parseParagraph('short');

    const selection = resolveRememberedCursor(doc, 500);

    expect(selection?.head).toBe(6);
    expect(selection?.$head.parent.textContent).toBe('short');
  });
});
