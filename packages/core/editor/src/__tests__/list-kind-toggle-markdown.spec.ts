import { setupList } from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';
import { createMarkdownHarness } from './production-markdown-test-helpers';

// Switching a list between kinds from the selection toolbar must round-trip
// through Markdown: the container marker follows the kind, and a task item's
// checked state is not silently cleared by a detour through another kind.
const { selectAll, apply, serialize } = createMarkdownHarness();
const list = setupList();

describe('list kind toggles', () => {
  it('starts a new task item unchecked', () => {
    const bullet = selectAll('- alpha\n- bravo');

    const task = apply(bullet, list.command.toggleTaskList);

    expect(serialize(task)).toBe('- [ ] alpha\n- [ ] bravo');
  });

  it('keeps an ordered run loose when converting it to tasks', () => {
    const ordered = selectAll('1. ordered one\n\n1. ordered two');

    const task = apply(ordered, list.command.toggleTaskList);

    expect(serialize(task)).toBe('1. [ ] ordered one\n\n1. [ ] ordered two');
  });

  it('keeps checked state when a task list detours through a bullet list', () => {
    const checked = selectAll('- [x] alpha\n- [x] bravo');

    const bullet = apply(checked, list.command.toggleBulletList);
    expect(serialize(bullet)).toBe('- alpha\n- bravo');

    const back = apply(bullet, list.command.toggleTaskList);

    // Regression: the task toggle forced `checked: false`, so correcting a
    // mis-click cleared boxes the user had ticked.
    expect(serialize(back)).toBe('- [x] alpha\n- [x] bravo');
  });

  it('keeps checked state when a task list takes an ordered marker', () => {
    const checked = selectAll('- [x] alpha\n- [x] bravo');

    // Asking for a number does not ask for the checkboxes to go: the marker is
    // a whole-list property, task-ness is per item. This used to detour through
    // `1. alpha`, so saving in between lost the boxes for good.
    const ordered = apply(checked, list.command.toggleOrderedList);
    expect(serialize(ordered)).toBe('1. [x] alpha\n1. [x] bravo');

    // Pressing the task toggle when every item is already a task turns the list
    // off, rather than clearing boxes the user had ticked.
    const off = apply(ordered, list.command.toggleTaskList);
    expect(serialize(off)).toBe('alpha\n\nbravo');
  });

  it('round-trips a bullet list through task and back', () => {
    const bullet = selectAll('- alpha\n- bravo');

    const task = apply(bullet, list.command.toggleTaskList);
    expect(serialize(task)).toBe('- [ ] alpha\n- [ ] bravo');

    const back = apply(task, list.command.toggleBulletList);
    expect(serialize(back)).toBe('- alpha\n- bravo');
  });
});
