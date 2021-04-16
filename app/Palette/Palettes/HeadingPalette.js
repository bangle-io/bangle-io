import { EditorManagerContext } from '../../editor/EditorManager';
import React, { useContext } from 'react';
import { HEADING_PALETTE, PaletteTypeBase } from '../paletteTypes';
import { Selection } from '@bangle.dev/core/prosemirror/state';
import { NullIcon, PaletteUI } from 'ui-components/index';
import { addBoldToTitle } from '../utils';

export class HeadingPalette extends PaletteTypeBase {
  static type = HEADING_PALETTE;
  static identifierPrefix = '#';
  static description = 'Jump to a heading';
  static PaletteIcon = NullIcon;
  static UIComponent = HeadingPaletteUIComponent;
  static placeholder = 'Type a heading name';
}

function HeadingPaletteUIComponent({ query, paletteProps, dismissPalette }) {
  const { primaryEditor } = useContext(EditorManagerContext);

  const getResolvedItems = ({ query }) => {
    if (!primaryEditor || primaryEditor.destroyed) {
      return [];
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
          title: addBoldToTitle(r.title, query),
          onExecute: () => {
            dismissPalette();
            // Using this to wait for editor to get focused
            setTimeout(() => {
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
            }, 10);
          },
        };
      });
  };

  return <PaletteUI items={getResolvedItems({ query })} {...paletteProps} />;
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
