import type { Node as PMNode } from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';
import { createProductionMarkdown } from './production-markdown-test-helpers';

type Signature = {
  readonly children?: readonly Signature[];
  readonly text?: string;
  readonly type: string;
};

function signature(node: PMNode): Signature {
  return {
    type: node.type.name,
    ...(node.isText ? { text: node.text ?? '' } : {}),
    ...(node.childCount > 0
      ? {
          children: Array.from({ length: node.childCount }, (_, index) =>
            signature(node.child(index)),
          ),
        }
      : {}),
  };
}

describe('edited list document states', () => {
  it('preserves three-block sequences and reaches a fixed point', () => {
    const markdown = createProductionMarkdown();
    const paragraph = markdown.schema.nodes.paragraph;
    if (!paragraph) throw new Error('missing paragraph node');
    const blockCases = [
      ['paragraph', 'alpha'],
      ['hard-break paragraph', 'alpha  \nnext'],
      ['blockquote', '> quote'],
      ['heading', '# heading'],
      ['thematic break', '***'],
      ['multiline fence', '```ts\none\ntwo\n```'],
      ['nested bullet', '- nested'],
      ['nested ordered', '1. nested'],
      ['nested task', '- [x] nested'],
      ['table', '| h |\n| --- |\n| cell |'],
      ['display math', '$$\nx+y\n$$'],
    ] as const;
    const blocks = blockCases.map(([name, source]) => {
      const node = markdown.parser.parse(source).firstChild;
      if (!node) throw new Error(`missing block for ${name}`);
      return { name, node };
    });
    const failures: string[] = [];

    for (const task of [false, true]) {
      for (const ordered of [false, true]) {
        const marker = ordered ? '1.' : '-';
        const checkbox = task ? ' [ ]' : '';
        const parsed = markdown.parser.parse(
          `${marker}${checkbox} seed\n${marker}${checkbox} sibling`,
        );
        const first = parsed.firstChild;
        if (!first) throw new Error('missing seed item');
        for (const a of blocks) {
          for (const b of blocks) {
            for (const c of blocks) {
              const editedItem = first.type.create(first.attrs, [
                a.node,
                b.node,
                c.node,
              ]);
              const edited = parsed.type.create(parsed.attrs, [
                editedItem,
                parsed.child(1),
              ]);
              const output = markdown.serializer.serialize(edited);
              const reparsed = markdown.parser.parse(output);
              const actualItem = reparsed.firstChild;
              if (!actualItem) {
                failures.push(
                  `${task}/${ordered} ${a.name}, ${b.name}, ${c.name}: missing item`,
                );
                continue;
              }
              const expectedChildren = [a.node, b.node, c.node];
              if (task && a.node.type.name !== 'paragraph') {
                expectedChildren.unshift(paragraph.create());
              }
              const expected = expectedChildren.map(signature);
              const actual = Array.from(
                { length: actualItem.childCount },
                (_, index) => signature(actualItem.child(index)),
              );
              const fixed = markdown.serializer.serialize(reparsed);
              if (
                JSON.stringify(actual) !== JSON.stringify(expected) ||
                fixed !== output ||
                actualItem.attrs.kind !==
                  (task ? 'task' : ordered ? 'ordered' : 'bullet') ||
                actualItem.attrs.listKind !== (ordered ? 'ordered' : 'bullet')
              ) {
                failures.push(
                  `${task}/${ordered} ${a.name}, ${b.name}, ${c.name}\noutput=${JSON.stringify(output)}\nexpected=${JSON.stringify(expected)}\nactual=${JSON.stringify(actual)}\nfixed=${JSON.stringify(fixed)}`,
                );
              }
            }
          }
        }
      }
    }

    expect(failures.slice(0, 20)).toEqual([]);
  });
});
