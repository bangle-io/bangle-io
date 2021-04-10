import { EditorManagerContext } from 'app/editor/EditorManager';
import { useContext } from 'react';
import { HEADING_PALETTE } from '../paletteTypes';
import { Selection } from '@bangle.dev/core/prosemirror/state';

export function useHeadingPalette({ updatePalette }) {
  const { primaryEditor } = useContext(EditorManagerContext);

  return ({ query, paletteType }) => {
    if (
      paletteType !== HEADING_PALETTE ||
      !primaryEditor ||
      primaryEditor.destroyed
    ) {
      return null;
    }

    const headings = [];

    primaryEditor.view.state.doc.forEach((node, offset, i) => {
      console.log(node.toString(), offset);
      if (node.type.name === 'heading') {
        headings.push({
          uid: 'heading' + i,
          title: node.textContent,
          onExecute: () => {
            // Using this to wait for editor to get focused
            requestAnimationFrame(() => {
              if (!primaryEditor || primaryEditor.destroyed) {
                // dismiss it
                return;
              }
              const { dispatch, state } = primaryEditor.view;
              const tr = state.tr;
              dispatch(
                tr
                  // .setSelection(Selection.atEnd(tr.doc))
                  .setSelection(Selection.near(tr.doc.resolve(offset)))
                  .scrollIntoView(),
              );
            });

            return true;
          },
        });
      }
    });

    return headings;
  };
}
