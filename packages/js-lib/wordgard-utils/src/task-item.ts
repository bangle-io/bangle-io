import { Node, Plot, Schema } from 'wordgard/doc';
import { BulletList, OrderedList } from 'wordgard/types';

/**
 * A task ("todo") list item. The boolean parameter is the checked state —
 * Wordgard's one-param model replaces the ProseMirror flat-list
 * `{kind: 'task', checked}` attrs. Task items normally live inside a
 * {@link BulletList} (they serialize to Markdown as `- [ ]` / `- [x]`
 * bullets), which requires {@link taskListContentOverrides} in any schema
 * that uses them.
 */
export const TaskItem = Plot.Type.define<boolean>('TaskItem', {
  defaultParam: false,
  validate: 'boolean',
  blockContent: Node.Group.Content,
  defining: true,
  shape: {
    element: 'li',
    attributes: (checked) => ({ 'data-task-checked': String(checked) }),
    readElement: (elt) => elt.getAttribute('data-task-checked') === 'true',
  },
});

/**
 * Schema overrides allowing {@link TaskItem} inside the built-in list plots
 * (whose content queries are otherwise fixed to the stock list items).
 * Include these alongside `TaskItem` when defining a schema.
 *
 * {@link OrderedList} is included deliberately: GFM recognizes `1. [ ] x` as
 * a task item inside an ordered list, so the Markdown parser can produce
 * that shape — a schema that rejects it would turn a legal note into a load
 * failure. Serialization normalizes such items back to `- [ ]` bullets
 * (matching the ProseMirror engine), so the shape is transient.
 */
export const taskListContentOverrides: readonly Schema.Override[] = [
  Schema.Override.plotContent(BulletList, (content) => [content, TaskItem]),
  Schema.Override.plotContent(OrderedList, (content) => [content, TaskItem]),
];
