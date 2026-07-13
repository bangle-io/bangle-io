import { collection } from '../common';
import type { EditorState, PMNode } from '../pm';
import { createDragHandleEventsPlugin } from './drag-handle';
import {
  BLOCK_HANDLE_BUTTON_GAP,
  DEFAULT_BLOCK_HANDLE_LABELS,
} from './drag-handle-ui';
import { createDragHandleViewPlugin } from './drag-handle-view';
import type {
  GlobalDragHandlePluginOptions,
  HandleOrientationArgs,
  NodeOffsetCalculationArgs,
} from './helpers';

type DragConfig = {
  pluginOptions?: Partial<GlobalDragHandlePluginOptions> | undefined;
};

function defaultCalculateNodeOffset(args: NodeOffsetCalculationArgs) {
  const { node, rect, lineHeight, paddingTop } = args;
  const newRect = { ...rect };

  newRect.top += (lineHeight - 24) / 2;
  newRect.top += paddingTop;

  // For UL/OL, shift handle to the left
  if (node.matches('ul:not([data-type=taskList]) li, ol li')) {
    newRect.left -= 20;
  }
  newRect.width = 20;
  return newRect;
}

function defaultIsDoc(_state: EditorState, node: PMNode) {
  return node.type.name === 'doc';
}

function defaultGetHandleOrientation({
  rect,
  gutterWidth,
}: HandleOrientationArgs) {
  const horizontalClusterWidth = rect.width * 2 + BLOCK_HANDLE_BUTTON_GAP;
  return gutterWidth >= horizontalClusterWidth + 6
    ? ('horizontal' as const)
    : ('vertical' as const);
}
function defaultIsListItem(_state: EditorState, node: PMNode) {
  return node.type.name === 'list';
}
function defaultIsTableRow(_state: EditorState, node: PMNode) {
  return node.type.name === 'table_row';
}

export function setupDragNode(config: DragConfig) {
  const mergedConfig = {
    dragHandleWidth: 20,
    scrollTreshold: 100,
    excludedTags: [],
    customNodes: [],
    labels: DEFAULT_BLOCK_HANDLE_LABELS,
    getHandleOrientation: defaultGetHandleOrientation,
    onBlockAdd: () => {},
    isTableRow: defaultIsTableRow,
    isListItem: defaultIsListItem,
    isDoc: defaultIsDoc,
    createOrderedListWithNode: (schema, droppedNode) =>
      schema.nodes.list?.createAndFill(null, droppedNode) || null,
    dragHandleClassName: 'drag-handle',
    dragHandleHideClassName: 'hidden',
    editorContentClassName: 'ProseMirror',
    editorContainerClassName: 'ProseMirror',
    editorDraggingClassName: 'dragging',
    notDraggableClassName: 'not-draggable',
    movableNodeSelectors: [],
    horizontalNodeOffset: 50,
    calculateNodeOffset: defaultCalculateNodeOffset,
    ...(config.pluginOptions || {}),
  } satisfies Required<GlobalDragHandlePluginOptions>;

  const plugin = {
    dragNode: createDragHandleViewPlugin(mergedConfig),
    dragNodeEvents: createDragHandleEventsPlugin(mergedConfig),
  };

  return collection({
    id: 'drag-node',
    plugin,
  });
}
