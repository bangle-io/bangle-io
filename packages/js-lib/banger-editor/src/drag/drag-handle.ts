import type { PMNode } from '../pm';
import { Plugin, PluginKey } from '../pm';

import { Fragment, Slice } from '../pm';
import { isNodeSelection } from '../pm-utils';
import {
  getCurrentListType,
  hideDragHandle,
  resetListType,
  showDragHandle,
} from './drag-handle-view';
import {
  type GlobalDragHandlePluginOptions,
  ORDERED_LIST_TAG,
  absoluteRect,
  nodeDOMAtCoords,
} from './helpers';

export const dragHandleEventsPluginKey = new PluginKey('drag-handle-events');

export function createDragHandleEventsPlugin(
  options: Required<GlobalDragHandlePluginOptions>,
) {
  return new Plugin({
    key: dragHandleEventsPluginKey,
    props: {
      handleDOMEvents: {
        mousemove: (view, event) => {
          if (!view.editable) {
            return false;
          }
          const node = nodeDOMAtCoords(
            {
              x:
                event.clientX +
                options.horizontalNodeOffset +
                options.dragHandleWidth,
              y: event.clientY,
            },
            options,
          );
          const notDragging = node?.closest(
            `.${options.notDraggableClassName}`,
          );
          const excludedTagList = options.excludedTags
            .concat(['ol', 'ul'])
            .join(', ');

          if (
            !(node instanceof Element) ||
            node.matches(excludedTagList) ||
            notDragging
          ) {
            hideDragHandle(options);
            return false;
          }

          const compStyle = window.getComputedStyle(node);
          const parsedLineHeight = Number.parseInt(compStyle.lineHeight, 10);
          const lineHeight = Number.isNaN(parsedLineHeight)
            ? Number.parseInt(compStyle.fontSize, 10) * 1.2
            : parsedLineHeight;
          const paddingTop = Number.parseInt(compStyle.paddingTop, 10);

          const result = options.calculateNodeOffset({
            node,
            rect: absoluteRect(node),
            lineHeight,
            paddingTop,
            view,
            event: event as MouseEvent,
            state: view.state,
          });

          // Position the handle
          const handleEl =
            document.querySelector<HTMLElement>('[data-drag-handle]');
          if (!handleEl) return false;

          handleEl.style.left = `${result.left - result.width}px`;
          handleEl.style.top = `${result.top}px`;

          showDragHandle(options);
          return false; // Do not prevent PM’s default
        },

        keydown: () => {
          hideDragHandle(options);
          return false;
        },

        mousewheel: () => {
          hideDragHandle(options);
          return false;
        },

        dragenter: (view) => {
          view.dom.classList.add(options.editorDraggingClassName);
          return false;
        },

        drop: (view, event) => {
          view.dom.classList.remove(options.editorDraggingClassName);
          hideDragHandle(options);

          let droppedNode: PMNode | null = null;
          const dropPos = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });

          if (!dropPos) {
            resetListType();
            return false;
          }

          // If we dropped an entire node selection
          if (isNodeSelection(view.state.selection)) {
            droppedNode = view.state.selection.node;
          }

          if (!droppedNode) {
            resetListType();
            return false;
          }

          const resolvedPos = view.state.doc.resolve(dropPos.pos);
          const isDroppedInsideList = options.isListItem(
            view.state,
            resolvedPos.parent,
          );

          // If dropping a list item outside a list but it was originally an ordered list
          if (
            isNodeSelection(view.state.selection) &&
            options.isListItem(view.state, droppedNode) &&
            !isDroppedInsideList &&
            getCurrentListType() === ORDERED_LIST_TAG
          ) {
            const newList = options.createOrderedListWithNode(
              view.state.schema,
              droppedNode,
            );
            if (newList) {
              const slice = new Slice(Fragment.from(newList), 0, 0);
              view.dragging = {
                slice,
                move: event.ctrlKey,
              };
            }
          }

          resetListType();
          return false;
        },

        dragend: (view) => {
          view.dom.classList.remove(options.editorDraggingClassName);
          resetListType();
          return false;
        },
      },
    },
  });
}
