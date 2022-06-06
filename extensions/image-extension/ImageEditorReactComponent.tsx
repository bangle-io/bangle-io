import React from 'react';

import type { EditorState, EditorView } from '@bangle.dev/pm';
import { NodeSelection } from '@bangle.dev/pm';
import { useEditorViewContext } from '@bangle.dev/react';
import {
  FloatingMenu,
  Menu,
  MenuButton,
  MenuGroup,
} from '@bangle.dev/react-menu';

import { menuKey } from './config';
import {
  getImageAltScaleFactor,
  updateImageAltScaleFactor,
} from './image-file-helpers';

function ScaleButton({
  scaleFactor,
  view,
  isActive,
}: {
  scaleFactor: number;
  view: EditorView;
  isActive: boolean;
}) {
  const scaleDisplay = Math.ceil(scaleFactor * 100);

  return (
    <MenuButton
      hintPos="top"
      hint={'Scale image ' + scaleDisplay + '%'}
      onMouseDown={(e) => {
        e.preventDefault();
        updateImageNodeAttribute((existingAttrs: any = {}) => ({
          alt: updateImageAltScaleFactor(existingAttrs?.alt, scaleFactor),
        }))(view.state, view.dispatch, view);
      }}
      isActive={isActive}
    >
      <svg viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
        <text
          x="13"
          y="13"
          stroke="currentColor"
          textAnchor="middle"
          alignmentBaseline="central"
          dominantBaseline="middle"
        >
          {scaleDisplay}
        </text>
      </svg>
    </MenuButton>
  );
}

export function ImageEditorReactComponent() {
  const view = useEditorViewContext();

  return (
    <>
      <FloatingMenu
        menuKey={menuKey}
        renderMenuType={({ type }) => {
          if (type === 'imageMenu') {
            const currentScaleFactor = getSelectedImageNodeScale(view.state);

            return (
              <Menu>
                <MenuGroup>
                  <ScaleButton
                    view={view}
                    isActive={currentScaleFactor === 0.25}
                    scaleFactor={0.25}
                  />
                  <ScaleButton
                    view={view}
                    isActive={currentScaleFactor === 0.5}
                    scaleFactor={0.5}
                  />
                  <ScaleButton
                    view={view}
                    isActive={currentScaleFactor === 0.75}
                    scaleFactor={0.75}
                  />
                  <ScaleButton
                    view={view}
                    isActive={currentScaleFactor === 1}
                    scaleFactor={1}
                  />
                </MenuGroup>
              </Menu>
            );
          }

          return null;
        }}
      />
    </>
  );
}

// TODO move this to bangle.dev, the only change here is that attr can be a function
const updateImageNodeAttribute =
  (attr = {}) =>
  (
    state: EditorState,
    dispatch: EditorView['dispatch'] | undefined,
    view: EditorView | undefined,
  ) => {
    if (!(state.selection instanceof NodeSelection) || !state.selection.node) {
      return false;
    }
    const { node } = state.selection;

    if (node.type !== state.schema.nodes.image) {
      return false;
    }

    if (dispatch) {
      const newAttrs = typeof attr === 'function' ? attr(node.attrs) : attr;
      dispatch(
        state.tr.setNodeMarkup(state.selection.$from.pos, undefined, {
          ...node.attrs,
          ...newAttrs,
        }),
      );
    }

    return true;
  };

function getSelectedImageNodeScale(state: EditorState) {
  if (!(state.selection instanceof NodeSelection) || !state.selection.node) {
    return undefined;
  }
  const { node } = state.selection;

  if (node.type !== state.schema.nodes.image) {
    return undefined;
  }
  const { alt } = node.attrs ?? {};

  return getImageAltScaleFactor(alt);
}
