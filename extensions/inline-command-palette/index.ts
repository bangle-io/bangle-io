import { keybindings } from 'config/keybindings';
import { Extension } from 'extension-registry';
import { inlinePalette, queryInlinePaletteActive } from 'inline-palette';

import { keymap } from '@bangle.dev/pm';

import { extensionName, paletteMarkName, palettePluginKey } from './config';
import { InlineCommandPalette } from './InlineCommandPalette';

const getScrollContainer = (view) => {
  return view.dom.parentElement;
};

const trigger = '/';
const extension = Extension.create({
  name: extensionName,
  editor: {
    ReactComponent: InlineCommandPalette,
    specs: [inlinePalette.spec({ markName: paletteMarkName, trigger })],
    highPriorityPlugins: [
      inlinePalette.plugins({
        key: palettePluginKey,
        markName: paletteMarkName,
        tooltipRenderOpts: {
          getScrollContainer,
        },
      }),
    ],
    plugins: [
      keymap({
        [keybindings.toggleInlineCommandPalette.key]: (
          state,
          dispatch,
          view,
        ): boolean => {
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
          tr.replaceSelectionWith(
            schema.text(trigger, [mark, ...marks]),
            false,
          );
          dispatch?.(tr);
          return true;
        },
      }),
    ],
  },
});

export default extension;
