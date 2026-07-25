import {
  AllSelection,
  type Command,
  EditorState,
  setupList,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';
import { createProductionMarkdown } from './production-markdown-test-helpers';

// Switching a list between kinds from the selection toolbar must round-trip
// through Markdown: the container marker follows the kind, and a task item's
// checked state is not silently cleared by a detour through another kind.
function setup() {
  const markdown = createProductionMarkdown();
  const list = setupList();

  const stateFrom = (source: string) => {
    const doc = markdown.parser.parse(source);
    return EditorState.create({
      doc,
      schema: markdown.schema,
      selection: new AllSelection(doc),
    });
  };
  const apply = (state: EditorState, command: Command) => {
    let next = state;
    command(state, (tr) => {
      next = state.apply(tr);
    });
    return next;
  };
  return {
    stateFrom,
    apply,
    serialize: (state: EditorState) => markdown.serializer.serialize(state.doc),
    list,
  };
}

describe('list kind toggles', () => {
  it('starts a new task item unchecked', () => {
    const { stateFrom, apply, serialize, list } = setup();
    const bullet = stateFrom('- alpha\n- bravo');

    const task = apply(bullet, list.command.toggleTaskList);

    expect(serialize(task)).toBe('- [ ] alpha\n- [ ] bravo');
  });

  it('keeps checked state when a task list detours through a bullet list', () => {
    const { stateFrom, apply, serialize, list } = setup();
    const checked = stateFrom('- [x] alpha\n- [x] bravo');

    const bullet = apply(checked, list.command.toggleBulletList);
    expect(serialize(bullet)).toBe('- alpha\n- bravo');

    const back = apply(bullet, list.command.toggleTaskList);

    // Regression: the task toggle forced `checked: false`, so correcting a
    // mis-click cleared boxes the user had ticked.
    expect(serialize(back)).toBe('- [x] alpha\n- [x] bravo');
  });

  it('keeps checked state when a task list detours through an ordered list', () => {
    const { stateFrom, apply, serialize, list } = setup();
    const checked = stateFrom('- [x] alpha\n- [x] bravo');

    const ordered = apply(checked, list.command.toggleOrderedList);
    expect(serialize(ordered)).toBe('1. alpha\n1. bravo');

    const back = apply(ordered, list.command.toggleTaskList);

    // The container stays ordered because that is what the user asked for;
    // only the checkbox state has to survive the detour.
    expect(serialize(back)).toBe('1. [x] alpha\n1. [x] bravo');
  });

  it('round-trips a bullet list through task and back', () => {
    const { stateFrom, apply, serialize, list } = setup();
    const bullet = stateFrom('- alpha\n- bravo');

    const task = apply(bullet, list.command.toggleTaskList);
    expect(serialize(task)).toBe('- [ ] alpha\n- [ ] bravo');

    const back = apply(task, list.command.toggleBulletList);
    expect(serialize(back)).toBe('- alpha\n- bravo');
  });
});
