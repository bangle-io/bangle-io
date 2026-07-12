import {
  type Command,
  collection,
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
  type PMNode,
} from '@bangle.io/prosemirror-plugins';
import type { EditorView } from 'prosemirror-view';
import {
  createBlockActionButton,
  isBlockActionEvent,
  markEditorChrome,
} from './block-action-button';

const FRONTMATTER_ACTIONS_PLUGIN_KEY = new PluginKey('frontmatter-actions');

export type FrontmatterActionsConfig = {
  deleteFrontmatter: Command;
};

/**
 * Renders a Delete button in the frontmatter block's header band, mirroring
 * the code block's copy/language widgets. It is a single always-visible
 * action rather than a dropdown menu: the block currently has exactly one
 * block-level action, and the shared command layer keeps the door open for a
 * table-style menu if more actions accrue.
 */
export function setupFrontmatterActions(config: FrontmatterActionsConfig) {
  return collection({
    id: 'frontmatter-actions',
    plugin: {
      frontmatterActions: new Plugin({
        key: FRONTMATTER_ACTIONS_PLUGIN_KEY,
        state: {
          init: (_, state) => createDecorations(state.doc, config),
          apply(tr, old: DecorationSet) {
            if (!tr.docChanged) {
              return old.map(tr.mapping, tr.doc);
            }
            return createDecorations(tr.doc, config);
          },
        },
        props: {
          decorations(state) {
            return FRONTMATTER_ACTIONS_PLUGIN_KEY.getState(state);
          },
        },
      }),
    },
  });
}

function createDecorations(
  doc: PMNode,
  config: FrontmatterActionsConfig,
): DecorationSet {
  if (doc.firstChild?.type.name !== 'frontmatter') {
    return DecorationSet.empty;
  }

  return DecorationSet.create(doc, [
    Decoration.widget(1, (view) => createDeleteButtonWidget(view, config), {
      key: 'frontmatter-delete',
      side: -1,
      ignoreSelection: true,
      stopEvent: isBlockActionEvent,
    }),
  ]);
}

function createDeleteButtonWidget(
  editorView: EditorView,
  config: FrontmatterActionsConfig,
): HTMLElement {
  const wrapper = document.createElement('span');
  wrapper.className = 'prosemirror-frontmatter-actions-widget';
  markEditorChrome(wrapper);

  wrapper.appendChild(
    createBlockActionButton({
      className: 'prosemirror-block-delete-button',
      text: t.app.editor.frontmatter.delete,
      label: t.app.editor.frontmatter.deleteLabel,
      onClick: () => {
        config.deleteFrontmatter(
          editorView.state,
          editorView.dispatch,
          editorView,
        );
        editorView.focus();
      },
    }),
  );
  return wrapper;
}
