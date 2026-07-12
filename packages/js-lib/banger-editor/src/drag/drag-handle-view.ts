import type { EditorView } from '../pm';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '../pm';
import { isNodeSelection } from '../pm-utils';
import { addBlockNextTo } from './add-block';
import { createBlockHandle } from './drag-handle-ui';
import {
  calcNodePos,
  type GlobalDragHandlePluginOptions,
  nodeDOMAtCoords,
  nodePosAtDOM,
} from './helpers';

let blockHandleElement: HTMLElement | null = null;
let hoveredBlockDom: Element | null = null;
let listType = '';

const dragHandleViewPluginKey = new PluginKey('drag-handle-view');

/** The wrapper holding the "+" button and the drag grip. */
export function getBlockHandleElement() {
  return blockHandleElement;
}

/** Records which block DOM node the handle cluster is currently anchored to. */
export function setHoveredBlockDom(node: Element | null) {
  hoveredBlockDom = node;
}

function handleDragStart(
  event: DragEvent,
  view: EditorView,
  options: Required<GlobalDragHandlePluginOptions>,
) {
  view.focus();
  if (!event.dataTransfer) return;

  // Prefer the block recorded on hover — the grip may sit further from the
  // block than the coordinate probe assumes (e.g. vertical orientation).
  const node = hoveredBlockDom?.isConnected
    ? hoveredBlockDom
    : nodeDOMAtCoords(
        {
          x:
            event.clientX +
            options.horizontalNodeOffset +
            options.dragHandleWidth,
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
  const { dom, text } = view.serializeForClipboard(slice);
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
      const { wrapper, plusButton, dragButton } = createBlockHandle(
        options.labels,
      );
      blockHandleElement = wrapper;
      // The class is used by the editor mouseout containment check below.
      wrapper.classList.add(options.dragHandleClassName);
      plusButton.classList.add(options.dragHandleClassName);
      dragButton.classList.add(options.dragHandleClassName);
      dragButton.draggable = true;
      dragButton.dataset.dragHandle = '';

      // Attach DOM listeners
      const onDragHandleDragStart = (e: DragEvent) => {
        handleDragStart(e, view, options);
      };
      dragButton.addEventListener('dragstart', onDragHandleDragStart);

      const onDragHandleDrag = (e: DragEvent) => {
        hideDragHandle(options);
        const scrollY = window.scrollY;
        if (e.clientY < options.scrollTreshold) {
          window.scrollTo({ top: scrollY - 30, behavior: 'smooth' });
        } else if (window.innerHeight - e.clientY < options.scrollTreshold) {
          window.scrollTo({ top: scrollY + 30, behavior: 'smooth' });
        }
      };
      dragButton.addEventListener('drag', onDragHandleDrag);

      // Keep the editor focused and the hovered block recorded; a mousedown
      // that reaches the document would blur the editor before the click.
      const onPlusMouseDown = (e: MouseEvent) => {
        e.preventDefault();
      };
      plusButton.addEventListener('mousedown', onPlusMouseDown);

      const onPlusClick = (e: MouseEvent) => {
        e.preventDefault();
        const target = hoveredBlockDom;
        if (!target || !target.isConnected) {
          return;
        }
        const above = e.altKey;
        if (addBlockNextTo(view, target, { above }, options)) {
          options.onBlockAdd(view, { above });
        }
        hideDragHandle(options);
      };
      plusButton.addEventListener('click', onPlusClick);

      hideDragHandle(options);

      view.dom.parentElement?.appendChild(wrapper);

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
          wrapper.remove();
          dragButton.removeEventListener('drag', onDragHandleDrag);
          dragButton.removeEventListener('dragstart', onDragHandleDragStart);
          plusButton.removeEventListener('mousedown', onPlusMouseDown);
          plusButton.removeEventListener('click', onPlusClick);
          blockHandleElement = null;
          hoveredBlockDom = null;
          view.dom.parentElement?.removeEventListener(
            'mouseout',
            hideHandleOnEditorOut,
          );
        },
      };
    },
  });
}

// Simple helpers to show/hide the block handle cluster
export function hideDragHandle(
  options: Required<GlobalDragHandlePluginOptions>,
) {
  blockHandleElement?.classList.add(options.dragHandleHideClassName);
  hoveredBlockDom = null;
}
export function showDragHandle(
  options: Required<GlobalDragHandlePluginOptions>,
) {
  blockHandleElement?.classList.remove(options.dragHandleHideClassName);
}

// So that other plugins can see which type of list we started with (ordered vs. un-ordered)
export function getCurrentListType() {
  return listType;
}
export function resetListType() {
  listType = '';
}
