import { c } from '../helper';

/**
 * Handlers for `command::editor:*` commands. They go through the
 * engine-agnostic `EditorEngineContract` and act on the active editor's
 * selection — the same underlying editor commands the slash menu runs
 * locally, exposed here so omni search (and keybindings) can reach them.
 */
export const editorOperationsHandlers = [
  c('command::editor:toggle-heading-1', ({ editorEngine }) => {
    editorEngine.toggleHeading(1);
  }),

  c('command::editor:toggle-heading-2', ({ editorEngine }) => {
    editorEngine.toggleHeading(2);
  }),

  c('command::editor:toggle-heading-3', ({ editorEngine }) => {
    editorEngine.toggleHeading(3);
  }),

  c('command::editor:insert-table', ({ editorEngine }) => {
    editorEngine.insertTable();
  }),
];
