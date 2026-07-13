import { toast } from '@bangle.io/ui-components';
import { c } from '../helper';

/**
 * Handlers for `command::editor:*` commands. They go through the
 * engine-agnostic `EditorEngineContract` and act on the active editor's
 * selection — the same underlying editor commands the slash menu runs
 * locally, exposed here so omni search (and keybindings) can reach them.
 *
 * The engine methods self-validate and return false when the action cannot
 * run (no active editor, read-only engine, selection inside a table for
 * block transforms); surface that instead of failing silently.
 */
function reportUnavailable(handled: boolean): void {
  if (!handled) {
    toast.error(t.app.toasts.editorCommandUnavailable);
  }
}

export const editorOperationsHandlers = [
  c('command::editor:toggle-heading-1', ({ editorEngine }) => {
    reportUnavailable(editorEngine.toggleHeading(1));
  }),

  c('command::editor:toggle-heading-2', ({ editorEngine }) => {
    reportUnavailable(editorEngine.toggleHeading(2));
  }),

  c('command::editor:toggle-heading-3', ({ editorEngine }) => {
    reportUnavailable(editorEngine.toggleHeading(3));
  }),

  c('command::editor:insert-table', ({ editorEngine }) => {
    reportUnavailable(editorEngine.insertTable());
  }),
];
