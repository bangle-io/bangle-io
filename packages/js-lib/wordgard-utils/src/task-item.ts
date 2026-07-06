import { Node, Plot, Schema } from 'wordgard/doc';
import { BulletList } from 'wordgard/types';

/**
 * A task ("todo") list item. The boolean parameter is the checked state —
 * Wordgard's one-param model replaces the ProseMirror flat-list
 * `{kind: 'task', checked}` attrs. Task items live inside a {@link BulletList}
 * (they serialize to Markdown as `- [ ]` / `- [x]` bullets), which requires
 * {@link taskListContentOverride} in any schema that uses them.
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
 * Schema override allowing {@link TaskItem} inside the built-in
 * {@link BulletList} (whose content query is otherwise fixed to the stock
 * list items). Include this alongside `TaskItem` when defining a schema.
 */
export const taskListContentOverride: Schema.Override =
  Schema.Override.plotContent(BulletList, (content) => [content, TaskItem]);
