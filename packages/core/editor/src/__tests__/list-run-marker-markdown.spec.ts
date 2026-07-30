import {
  type Command,
  EditorState,
  setupList,
  TextSelection,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';
import { createProductionMarkdown } from './production-markdown-test-helpers';

// Markdown decides list membership by the marker, so a marker change has to
// cover the whole contiguous run and must not rewrite anything else about an
// item. These assertions go through the production serializer because the bugs
// they cover were only visible in the saved Markdown.
const markdown = createProductionMarkdown();
const list = setupList();

function stateAt(source: string, from: string, to = from) {
  const doc = markdown.parser.parse(source);
  const find = (text: string, offset: number) => {
    let pos = -1;
    doc.descendants((node, nodePos) => {
      if (pos === -1 && node.isText && node.text?.includes(text)) {
        pos = nodePos + node.text.indexOf(text) + offset;
      }
    });
    if (pos === -1) throw new Error(`no "${text}" in ${source}`);
    return pos;
  };
  return EditorState.create({
    doc,
    schema: markdown.schema,
    selection: TextSelection.create(doc, find(from, 0), find(to, to.length)),
  });
}

function apply(state: EditorState, command: Command) {
  let next = state;
  command(state, (tr) => {
    next = state.apply(tr);
  });
  return next;
}

const serialize = (state: EditorState) =>
  markdown.serializer.serialize(state.doc);
const reserialize = (source: string) =>
  markdown.serializer.serialize(markdown.parser.parse(source));

describe('changing a list run marker', () => {
  it('keeps the checkbox when a task changes marker', () => {
    const out = serialize(
      apply(stateAt('- [x] alpha', 'alpha'), list.command.toggleOrderedList),
    );

    expect(out).toBe('1. [x] alpha');
    expect(reserialize(out)).toBe(out);
  });

  it('converts the whole run from a caret, tasks included', () => {
    const out = serialize(
      apply(
        stateAt('- alpha\n- [x] beta\n- gamma', 'beta'),
        list.command.toggleOrderedList,
      ),
    );

    expect(out).toBe('1. alpha\n1. [x] beta\n1. gamma');
    expect(reserialize(out)).toBe(out);
  });

  it('converts the whole run from a selection that covers part of it', () => {
    const out = serialize(
      apply(
        stateAt('- alpha\n- beta\n- gamma', 'alpha', 'beta'),
        list.command.toggleOrderedList,
      ),
    );

    // Selecting two of three items used to leave `- gamma` behind, which
    // Markdown reads as a second list.
    expect(out).toBe('1. alpha\n1. beta\n1. gamma');
    expect(reserialize(out)).toBe(out);
  });

  it('stops at a neighbour that already has the target marker', () => {
    // The neighbour is a task so over-expansion is visible: rewriting it too
    // would strip its checkbox instead of leaving the item untouched.
    const out = serialize(
      apply(
        stateAt('- alpha\n\n1. [ ] beta', 'alpha'),
        list.command.toggleOrderedList,
      ),
    );

    expect(out).toBe('1. alpha\n1. [ ] beta');
    expect(reserialize(out)).toBe(out);
  });

  it('converts the whole run when the selection ends inside a nested item', () => {
    const out = serialize(
      apply(
        stateAt('- [x] alpha\n- beta\n  - sub\n- gamma', 'alpha', 'sub'),
        list.command.toggleOrderedList,
      ),
    );

    // Endpoints at different depths used to fall back to the library command,
    // which stripped alpha's checkbox and left `- gamma` as a second list.
    expect(out).toBe('1. [x] alpha\n1. beta\n   - sub\n1. gamma');
    expect(reserialize(out)).toBe(out);
  });

  it('converts a mixed-marker selection to one uniform run', () => {
    const out = serialize(
      apply(
        stateAt('- alpha\n\n1. [x] beta', 'alpha', 'beta'),
        list.command.toggleBulletList,
      ),
    );

    // The first item already has the target marker, so keying the decision off
    // it alone used to defer to the library and drop beta's checkbox.
    expect(out).toBe('- alpha\n- [x] beta');
    expect(reserialize(out)).toBe(out);
  });

  it('leaves task-ness alone when toggling the task kind', () => {
    const out = serialize(
      apply(
        stateAt('- alpha\n- beta\n- gamma', 'beta'),
        list.command.toggleTaskList,
      ),
    );

    // Task-ness is per item in Markdown, so this must not spread to the run.
    expect(out).toBe('- alpha\n- [ ] beta\n- gamma');
    expect(reserialize(out)).toBe(out);
  });
});

describe('dedenting a list item', () => {
  it('adopts the destination marker without dropping a checkbox', () => {
    const out = serialize(
      apply(
        stateAt('- one\n  - [x] task\n- two', 'task'),
        list.command.dedentList,
      ),
    );

    expect(out).toBe('- one\n- [x] task\n- two');
    expect(reserialize(out)).toBe(out);
  });

  it('does not add a checkbox to a plain item', () => {
    const out = serialize(
      apply(
        stateAt('- [x] one\n  - nested\n- [x] two', 'nested'),
        list.command.dedentList,
      ),
    );

    expect(out).toBe('- [x] one\n- nested\n- [x] two');
    expect(reserialize(out)).toBe(out);
  });

  it('adopts an ordered destination marker', () => {
    const out = serialize(
      apply(
        stateAt('1. one\n   - nested\n1. two', 'nested'),
        list.command.dedentList,
      ),
    );

    expect(out).toBe('1. one\n1. nested\n1. two');
    expect(reserialize(out)).toBe(out);
  });
});
