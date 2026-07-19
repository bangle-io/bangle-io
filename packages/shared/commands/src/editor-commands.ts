import { narrow } from './common';

/**
 * Editor block actions exposed to app-level surfaces (omni search,
 * keybindings). Handlers go through the engine-agnostic
 * `EditorEngineContract` and operate on the active editor's selection — the
 * same underlying banger-editor commands the slash menu executes locally.
 */
// pattern command::editor:{action}-{target}
export const editorCommands = narrow([
  {
    id: 'command::editor:toggle-heading-1',
    title: 'Toggle Heading 1',
    keywords: ['heading', 'h1', 'title', 'editor'],
    dependencies: {
      services: ['editorEngine'],
    },
    omniSearch: 'note',
    args: null,
  },
  {
    id: 'command::editor:toggle-heading-2',
    title: 'Toggle Heading 2',
    keywords: ['heading', 'h2', 'subtitle', 'editor'],
    dependencies: {
      services: ['editorEngine'],
    },
    omniSearch: 'note',
    args: null,
  },
  {
    id: 'command::editor:toggle-heading-3',
    title: 'Toggle Heading 3',
    keywords: ['heading', 'h3', 'editor'],
    dependencies: {
      services: ['editorEngine'],
    },
    omniSearch: 'note',
    args: null,
  },
  {
    id: 'command::editor:insert-table',
    title: 'Insert Table',
    keywords: ['table', 'grid', 'insert', 'editor'],
    dependencies: {
      services: ['editorEngine'],
    },
    omniSearch: 'note',
    args: null,
  },
]);
