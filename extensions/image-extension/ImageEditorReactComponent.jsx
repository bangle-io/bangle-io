import React, { useEffect } from 'react';
import { useEditorViewContext } from '@bangle.dev/react';
import { NodeSelection } from '@bangle.dev/core/prosemirror/state';
import { menuKey, wsNameViewWeakStore } from './config';
import { useWorkspaceContext } from 'workspace-context';

import {
  FloatingMenu,
  Menu,
  MenuGroup,
  MenuButton,
} from '@bangle.dev/react-menu';
import {
  getImageAltScaleFactor,
  updateImageAltScaleFactor,
} from './image-file-helpers';

function ScaleButton({ scaleFactor, view, isActive }) {
  const scaleDisplay = Math.ceil(scaleFactor * 100);

  return (
    <MenuButton
      hintPos="top"
      hint={'Scale image ' + scaleDisplay + '%'}
      onMouseDown={(e) => {
        e.preventDefault();
        updateImageNodeAttribute((existingAttrs = {}) => ({
          alt: updateImageAltScaleFactor(existingAttrs.alt, scaleFactor),
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
  useAssociateViewWsName(view);
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

function useAssociateViewWsName(view) {
  const { wsName } = useWorkspaceContext();
  useEffect(() => {
    if (wsName) {
      wsNameViewWeakStore.set(view, wsName);
    }
    return () => {
      // I know weakmap will automatically clean it
      // but still :shrug
      wsNameViewWeakStore.delete(view);
    };
  }, [view, wsName]);
  return null;
}

// TODO move this to bangle.dev, the only change here is that attr can be a function
const updateImageNodeAttribute =
  (attr = {}) =>
  (state, dispatch, view) => {
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

function getSelectedImageNodeScale(state) {
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
