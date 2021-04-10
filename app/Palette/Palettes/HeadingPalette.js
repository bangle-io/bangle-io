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

    const headingNodes = [];
    primaryEditor.view.state.doc.forEach((node, offset, i) => {
      if (node.type.name === 'heading') {
        headingNodes.push({
          offset,
          level: node.attrs.level,
          title: node.textContent,
        });
      }
    });

    return headingNodes
      .filter((r) => strMatch(r.title + ' ' + r.level, query))
      .map((r, i) => {
        return {
          uid: 'heading' + i,
          title: r.title,
          onExecute: () => {
            // Using this to wait for editor to get focused
            requestAnimationFrame(() => {
              if (!primaryEditor || primaryEditor.destroyed) {
                return;
              }
              const { dispatch, state } = primaryEditor.view;
              const tr = state.tr;
              dispatch(
                tr
                  .setSelection(Selection.near(tr.doc.resolve(r.offset)))
                  .scrollIntoView(),
              );
            });

            return true;
          },
        };
      });
  };
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
