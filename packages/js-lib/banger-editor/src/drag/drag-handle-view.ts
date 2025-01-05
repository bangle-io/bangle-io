import { NodeSelection, Plugin, PluginKey, TextSelection } from '../pm';
import type { EditorView } from '../pm';
import {
  // @ts-ignore they donot export
  __serializeForClipboard,
} from '../pm';
import { isNodeSelection } from '../pm-utils';
import { createDragHandle } from './drag-handle-ui';
import {
  type GlobalDragHandlePluginOptions,
  calcNodePos,
  nodeDOMAtCoords,
  nodePosAtDOM,
} from './helpers';

let dragHandleElement: HTMLElement | null = null;
let listType = '';

export const dragHandleViewPluginKey = new PluginKey('drag-handle-view');

function handleDragStart(
  event: DragEvent,
  view: EditorView,
  options: Required<GlobalDragHandlePluginOptions>,
) {
  view.focus();
  if (!event.dataTransfer) return;

  const node = nodeDOMAtCoords(
    {
      x: event.clientX + options.horizontalNodeOffset + options.dragHandleWidth,
      y: event.clientY,
    },
    options,
  );
  if (!(node instanceof Element)) return;

  let draggedNodePos = nodePosAtDOM(node, view, options);
  if (draggedNodePos == null || draggedNodePos < 0) {
    return;
  }
  draggedNodePos = calcNodePos(draggedNodePos, view.state);

  const { from, to } = view.state.selection;
  const diff = from - to;

  const fromSelectionPos = calcNodePos(from, view.state);
  let differentNodeSelected = false;
  const nodePos = view.state.doc.resolve(fromSelectionPos);

  // Updated isDoc reference to pass EditorState
  if (options.isDoc(view.state, nodePos.node())) {
    differentNodeSelected = true;
  } else {
    const nodeSelection = NodeSelection.create(
      view.state.doc,
      nodePos.before(),
    );
    differentNodeSelected = !(
      draggedNodePos + 1 >= nodeSelection.$from.pos &&
      draggedNodePos <= nodeSelection.$to.pos
    );
  }

  // Adjust the selection to ensure we are selecting the correct node
  let selection = view.state.selection;
  if (!differentNodeSelected && diff !== 0 && !isNodeSelection(selection)) {
    // If a text selection is partially on the node, we refine it:
    const endSelection = NodeSelection.create(view.state.doc, to - 1);
    selection = TextSelection.create(
      view.state.doc,
      draggedNodePos,
      endSelection.$to.pos,
    );
  } else {
    // Otherwise, select the entire node
    selection = NodeSelection.create(view.state.doc, draggedNodePos);
    if (!isNodeSelection(selection)) {
      throw new Error('Selection is not a NodeSelection');
    }
    const selectedNode = selection.node;
    // Updated isTableRow reference
    if (
      selectedNode.type.isInline ||
      options.isTableRow(view.state, selectedNode)
    ) {
      const $pos = view.state.doc.resolve(selection.from);
      selection = NodeSelection.create(view.state.doc, $pos.before());
    }
  }
  view.dispatch(view.state.tr.setSelection(selection));

  // Check if we are dragging a list item (pass EditorState)
  if (
    view.state.selection instanceof NodeSelection &&
    options.isListItem(view.state, view.state.selection.node) &&
    node.parentElement
  ) {
    listType = node.parentElement.tagName;
  }

  // Copy the snippet to the dataTransfer
  const slice = view.state.selection.content();
  const { dom, text } = (__serializeForClipboard as any)(view, slice);
  event.dataTransfer.clearData();
  event.dataTransfer.setData('text/html', dom.innerHTML);
  event.dataTransfer.setData('text/plain', text);
  event.dataTransfer.effectAllowed = 'copyMove';
  event.dataTransfer.setDragImage(node, 0, 0);

  view.dragging = { slice, move: event.ctrlKey };
}

export function createDragHandleViewPlugin(
  options: Required<GlobalDragHandlePluginOptions>,
) {
  return new Plugin({
    key: dragHandleViewPluginKey,

    view: (view) => {
      // Attempt to find an existing drag-handle from user’s custom selector, else create one
      const handleBySelector = options.dragHandleSelector
        ? document.querySelector<HTMLElement>(options.dragHandleSelector)
        : null;

      dragHandleElement = handleBySelector ?? createDragHandle();
      dragHandleElement.draggable = true;
      dragHandleElement.dataset.dragHandle = '';
      dragHandleElement.classList.add(options.dragHandleClassName);

      // Attach DOM listeners
      const onDragHandleDragStart = (e: DragEvent) => {
        handleDragStart(e, view, options);
      };
      dragHandleElement.addEventListener('dragstart', onDragHandleDragStart);

      const onDragHandleDrag = (e: DragEvent) => {
        hideDragHandle(options);
        const scrollY = window.scrollY;
        if (e.clientY < options.scrollTreshold) {
          window.scrollTo({ top: scrollY - 30, behavior: 'smooth' });
        } else if (window.innerHeight - e.clientY < options.scrollTreshold) {
          window.scrollTo({ top: scrollY + 30, behavior: 'smooth' });
        }
      };
      dragHandleElement.addEventListener('drag', onDragHandleDrag);

      hideDragHandle(options);

      // Insert the handle if user’s selector didn’t return an existing handle
      if (!handleBySelector) {
        view.dom.parentElement?.appendChild(dragHandleElement);
      }

      // Hide handle when mouse leaves the editor area
      const hideHandleOnEditorOut = (event: MouseEvent) => {
        if (event.target instanceof Element) {
          const relatedTarget = event.relatedTarget as HTMLElement;
          const isInsideEditor =
            relatedTarget?.classList.contains(
              options.editorContainerClassName,
            ) || relatedTarget?.classList.contains(options.dragHandleClassName);

          if (isInsideEditor) return;
        }
        hideDragHandle(options);
      };
      view.dom.parentElement?.addEventListener(
        'mouseout',
        hideHandleOnEditorOut,
      );

      return {
        destroy: () => {
          if (!handleBySelector) {
            dragHandleElement?.remove?.();
          }
          dragHandleElement?.removeEventListener('drag', onDragHandleDrag);
          dragHandleElement?.removeEventListener(
            'dragstart',
            onDragHandleDragStart,
          );
          dragHandleElement = null;
          view.dom.parentElement?.removeEventListener(
            'mouseout',
            hideHandleOnEditorOut,
          );
        },
      };
    },
  });
}

// Simple helpers to show/hide the drag handle
export function hideDragHandle(
  options: Required<GlobalDragHandlePluginOptions>,
) {
  dragHandleElement?.classList.add(options.dragHandleHideClassName);
}
export function showDragHandle(
  options: Required<GlobalDragHandlePluginOptions>,
) {
  dragHandleElement?.classList.remove(options.dragHandleHideClassName);
}

// So that other plugins can see which type of list we started with (ordered vs. un-ordered)
export function getCurrentListType() {
  return listType;
}
export function resetListType() {
  listType = '';
}
