import type { PMNode, Schema } from '../pm';
import type { EditorState } from '../pm';
import type { EditorView } from '../pm';

export const ORDERED_LIST_TAG = 'OL';

export type ListType = 'ordered' | 'unordered' | 'todo' | null;

export interface NodeOffsetCalculationArgs {
  node: Element;
  rect: { top: number; left: number; width: number };
  lineHeight: number;
  paddingTop: number;
  view: EditorView;
  event: MouseEvent;
  state: EditorState;
}

export interface GlobalDragHandlePluginOptions {
  dragHandleWidth: number;
  scrollTreshold: number;
  dragHandleSelector?: string;
  excludedTags: string[];
  customNodes: string[];
  // Updated type checks to receive EditorState for more context
  isTableRow?: (state: EditorState, node: PMNode) => boolean;
  isListItem?: (state: EditorState, node: PMNode) => boolean;
  isDoc?: (state: EditorState, node: PMNode) => boolean;
  createOrderedListWithNode?: (
    schema: Schema,
    droppedNode: PMNode,
  ) => PMNode | null;
  dragHandleClassName?: string;
  dragHandleHideClassName?: string;
  editorContentClassName?: string;
  editorContainerClassName?: string;
  editorDraggingClassName?: string;
  notDraggableClassName?: string;
  movableNodeSelectors?: string[];
  horizontalNodeOffset?: number;
  // New callback to calculate node offset dynamically
  calculateNodeOffset?: (args: NodeOffsetCalculationArgs) => {
    top: number;
    left: number;
    width: number;
  };
}

export function absoluteRect(node: Element) {
  const data = node.getBoundingClientRect();
  const modal = node.closest('[role="dialog"]');
  if (modal && window.getComputedStyle(modal).transform !== 'none') {
    const modalRect = modal.getBoundingClientRect();
    return {
      top: data.top - modalRect.top,
      left: data.left - modalRect.left,
      width: data.width,
    };
  }
  return {
    top: data.top,
    left: data.left,
    width: data.width,
  };
}

export function nodeDOMAtCoords(
  coords: { x: number; y: number },
  options: Required<GlobalDragHandlePluginOptions>,
) {
  const selectors = [
    'li',
    'p:not(:first-child)',
    'pre',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    ...(options.movableNodeSelectors || []),
    ...options.customNodes.map((node) => `[data-type=${node}]`),
  ].join(', ');

  return document
    .elementsFromPoint(coords.x, coords.y)
    .find(
      (elem: Element) =>
        elem.parentElement?.matches?.(`.${options.editorContentClassName}`) ||
        elem.matches(selectors),
    );
}

export function nodePosAtDOM(
  node: Element,
  view: EditorView,
  options: Required<GlobalDragHandlePluginOptions>,
) {
  const boundingRect = node.getBoundingClientRect();
  return view.posAtCoords({
    left:
      boundingRect.left +
      options.horizontalNodeOffset +
      options.dragHandleWidth,
    top: boundingRect.top + 1,
  })?.inside;
}

export function calcNodePos(pos: number, state: EditorState) {
  const $pos = state.doc.resolve(pos);
  if ($pos.depth > 1) {
    return $pos.before($pos.depth);
  }
  return pos;
}
