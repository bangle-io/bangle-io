import { setupList } from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';
import { createMarkdownHarness } from './production-markdown-test-helpers';

// The insert-item shortcuts leave an *empty* item behind until the user types,
// and autosave serializes that transient state. These assertions pin what it
// writes to disk and that reading it back is a fixpoint, so a serializer change
// cannot quietly turn the empty item into a different construct.
const { caretAfter, apply, serialize, reserialize } = createMarkdownHarness();
const list = setupList();

describe('inserting a list item writes stable Markdown', () => {
  // The empty item serializes as its marker plus the separating space, so these
  // expectations are built from parts rather than written as literals with an
  // invisible trailing space.
  it.each([
    {
      name: 'bullet',
      source: '- alpha\n- bravo',
      below: ['- alpha', '- ', '- bravo'].join('\n'),
      above: ['- ', '- alpha', '- bravo'].join('\n'),
    },
    {
      name: 'ordered',
      source: '1. alpha\n1. bravo',
      below: ['1. alpha', '1. ', '1. bravo'].join('\n'),
      above: ['1. ', '1. alpha', '1. bravo'].join('\n'),
    },
    {
      name: 'task',
      source: '- [x] alpha\n- [x] bravo',
      below: ['- [x] alpha', '- [ ] ', '- [x] bravo'].join('\n'),
      above: ['- [ ] ', '- [x] alpha', '- [x] bravo'].join('\n'),
    },
  ])('$name run keeps one list either side of the new item', ({
    source,
    below,
    above,
  }) => {
    const withBelow = serialize(
      apply(caretAfter(source, 'alpha'), list.command.insertEmptyListBelow),
    );
    expect(withBelow).toBe(below);
    // A marker change here would split the run into two Markdown lists.
    expect(reserialize(withBelow)).toBe(withBelow);

    const withAbove = serialize(
      apply(caretAfter(source, 'alpha'), list.command.insertEmptyListAbove),
    );
    expect(withAbove).toBe(above);
    expect(reserialize(withAbove)).toBe(withAbove);
  });

  it('keeps a new task item unchecked and leaves the source item checked', () => {
    const next = apply(
      caretAfter('- [x] alpha', 'alpha'),
      list.command.insertEmptyListBelow,
    );

    expect(serialize(next)).toBe(['- [x] alpha', '- [ ] '].join('\n'));
  });

  it('adds the nested sibling at its own depth', () => {
    const next = serialize(
      apply(
        caretAfter('- parent\n  - child\n- sibling', 'child'),
        list.command.insertEmptyListBelow,
      ),
    );

    expect(next).toBe(
      ['- parent', '  - child', '  - ', '- sibling'].join('\n'),
    );
    expect(reserialize(next)).toBe(next);
  });
});
