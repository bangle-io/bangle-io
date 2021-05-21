import { inlinePalette, queryInlinePaletteActive } from 'inline-palette/index';
import { InlineCommandPalette } from './InlineCommandPalette';
import { extensionName, paletteMarkName, palettePluginKey } from './config';
import { Extension } from 'extension-helpers';
import { keymap } from '@bangle.dev/core/prosemirror/keymap';
import { keybindings } from 'config/keybindings';

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

const trigger = '/';
const extension = Extension.create({
  name: extensionName,
  EditorReactComponent: InlineCommandPalette,
  editorSpecs: [inlinePalette.spec({ markName: paletteMarkName, trigger })],
  highPriorityEditorPlugins: [
    inlinePalette.plugins({
      key: palettePluginKey,
      markName: paletteMarkName,
      tooltipRenderOpts: {
        getScrollContainer,
      },
    }),
  ],
  editorPlugins: [
    keymap({
      [keybindings.toggleInlineCommandPalette.key]: (state, dispatch, view) => {
        const { tr, schema, selection } = state;

        if (queryInlinePaletteActive(palettePluginKey)(state)) {
          return false;
        }
        const marks = selection.$from.marks();
        const mark = schema.mark(paletteMarkName, { trigger });

        const textBefore = selection.$from.nodeBefore?.text;
        // Insert a space so we follow the convention of <space> trigger
        if (textBefore && !textBefore.endsWith(' ')) {
          tr.replaceSelectionWith(schema.text(' '), false);
        }
        tr.replaceSelectionWith(schema.text(trigger, [mark, ...marks]), false);
        return dispatch?.(tr);
      },
    }),
  ],
});

export default extension;
