import { describe, expect, it, vi } from 'vitest';
import { createProductionMarkdown } from './production-markdown-test-helpers';

describe('ProseMirror list Markdown metadata', () => {
  it('retains tight and loose list semantics on flat items', () => {
    const markdown = createProductionMarkdown();
    const tight = markdown.parser.parse('- one\n- two');
    const loose = markdown.parser.parse('- one\n\n- two');

    expect(
      Array.from(
        { length: tight.childCount },
        (_, i) => tight.child(i).attrs.tight,
      ),
    ).toEqual([true, true]);
    expect(
      Array.from(
        { length: loose.childCount },
        (_, i) => loose.child(i).attrs.tight,
      ),
    ).toEqual([false, false]);
  });

  it('keeps task checked state separate from an ordered container', () => {
    const markdown = createProductionMarkdown();
    const doc = markdown.parser.parse('1. [x] done');
    const item = doc.firstChild;

    expect(item?.attrs).toMatchObject({
      checked: true,
      kind: 'task',
      listKind: 'ordered',
      tight: true,
    });
    expect(markdown.serializer.serialize(doc)).toBe('1. [x] done');
  });

  it('serializes a mixed tightness run as loose', () => {
    const markdown = createProductionMarkdown();
    const parsed = markdown.parser.parse('- one\n\n- two');
    const first = parsed.child(0);
    const second = parsed.child(1);
    const mixed = parsed.type.create(parsed.attrs, [
      first,
      second.type.create({ ...second.attrs, tight: true }, second.content),
    ]);

    expect(markdown.serializer.serialize(mixed)).toBe('- one\n\n- two');
  });

  it('computes list-run tightness in linear work', () => {
    const markdown = createProductionMarkdown();
    const itemCount = 300;
    const parsed = markdown.parser.parse(
      Array.from({ length: itemCount }, (_, i) => `- item ${i}`).join('\n'),
    );
    const child = vi.spyOn(parsed, 'child');

    const serialized = markdown.serializer.serialize(parsed);

    expect(serialized.split('\n')).toHaveLength(itemCount);
    expect(child.mock.calls.length).toBeLessThan(itemCount * 10);
  });
});
