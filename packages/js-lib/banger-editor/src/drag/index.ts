import { collection } from '../common';
import type { PMNode } from '../pm';
import type { EditorState } from '../pm';
import { createDragHandleEventsPlugin } from './drag-handle';
import { createDragHandleViewPlugin } from './drag-handle-view';
import type {
  GlobalDragHandlePluginOptions,
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
function defaultIsListItem(_state: EditorState, node: PMNode) {
  return node.type.name === 'list';
}
function defaultIsTableRow(_state: EditorState, node: PMNode) {
  return node.type.name === 'tableRow';
}

export function setupDragNode(config: DragConfig) {
  const mergedConfig = {
    dragHandleWidth: 20,
    scrollTreshold: 100,
    excludedTags: [],
    customNodes: [],
    dragHandleSelector: '',
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
