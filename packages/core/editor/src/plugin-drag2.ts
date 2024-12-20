import {
  Fragment,
  type ProseMirrorNode,
  type Schema,
  Slice,
} from '@prosekit/pm/model';
import { EditorState, NodeSelection } from '@prosekit/pm/state';
import { Plugin, PluginKey, TextSelection } from '@prosekit/pm/state';
import type { Transaction } from '@prosekit/pm/state';
import {
  Decoration,
  DecorationSet,
  // @ts-expect-error not exposed
  __serializeForClipboard,
} from '@prosekit/pm/view';
import type { EditorView } from '@prosekit/pm/view';
import { createDragHandle } from './drag-handle';

const ORDERED_LIST_TAG = 'OL';

type ListType = 'ordered' | 'unordered' | 'todo' | null;

export interface GlobalDragHandlePluginOptions {
  /**
   * The width of the drag handle
   */
  dragHandleWidth: number;

  /**
   * The threshold for scrolling
   */
  scrollTreshold: number;

  /**
   * The css selector to query for the drag handle. (eg: '.custom-handle').
   * If handle element is found, that element will be used as drag handle. If not, a default handle will be created
   */
  dragHandleSelector?: string;

  /**
   * Tags to be excluded for drag handle
   */
  excludedTags: string[];

  /**
   * Custom nodes to be included for drag handle
   */
  customNodes: string[];

  /**
   * Function to determine if a node is a table row. Defaults to node.type.name === 'tableRow'
   */
  isTableRow?: (node: ProseMirrorNode) => boolean;

  /**
   * Function to determine if a node is a list item. Defaults to node.type.name === 'listItem'
   */
  isListItem?: (node: ProseMirrorNode) => boolean;

  /**
   * Function to determine if a node is a doc node. Defaults to node.type.name === 'doc'
   */
  isDoc?: (node: ProseMirrorNode) => boolean;

  /**
   * Function to create an ordered list node wrapping a given node.
   * Default attempts view.state.schema.nodes.orderedList?.createAndFill(null, droppedNode)
   */
  createOrderedListWithNode?: (
    schema: Schema,
    droppedNode: ProseMirrorNode,
  ) => ProseMirrorNode | null;

  /**
   * The class name added to the drag handle element. Defaults to 'drag-handle'
   */
  dragHandleClassName?: string;

  /**
   * The class name added to hide the drag handle element. Defaults to 'hide'
   */
  dragHandleHideClassName?: string;

  /**
   * The class name to identify elements inside the editor (used for checking mouseout). Defaults to 'ProseMirror'
   */
  editorContentClassName?: string;

  /**
   *  The class name to identify elements inside the editor (used for checking mouseout). Defaults to 'ProseMirror', If you are using a custom container for the editor (.ProseMirror) div for padding and other styles, you can set this to the class name of the container
   */
  editorContainerClassName?: string;

  /**
   * The class name added to the editor during drag operation. Defaults to 'dragging'
   */
  editorDraggingClassName?: string;

  /**
   * The class name to identify non-draggable elements. Defaults to 'not-draggable'
   */
  notDraggableClassName?: string;

  /**
   * Additional CSS selectors for nodes that can be dragged.
   */
  movableNodeSelectors?: string[];

  /**
   * Horizontal offset for determining the draggable node. Defaults to 50.
   */
  horizontalNodeOffset?: number;
}

type RequiredFields<T> = {
  [K in keyof T]-?: T[K]; // Remove optional modifier
};

function absoluteRect(node: Element) {
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

function nodeDOMAtCoords(
  coords: { x: number; y: number },
  options: RequiredFields<GlobalDragHandlePluginOptions>,
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

function nodePosAtDOM(
  node: Element,
  view: EditorView,
  options: RequiredFields<GlobalDragHandlePluginOptions>,
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

function calcNodePos(pos: number, view: EditorView) {
  const $pos = view.state.doc.resolve(pos);
  if ($pos.depth > 1) return $pos.before($pos.depth);
  return pos;
}

export function createGlobalDragHandlePlugin(
  userOptions: Partial<GlobalDragHandlePluginOptions> = {},
) {
  const pluginKey = new PluginKey('drag-handle');
  const options: RequiredFields<GlobalDragHandlePluginOptions> = {
    dragHandleWidth: 20,
    scrollTreshold: 100,
    excludedTags: [],
    customNodes: [],
    dragHandleSelector: '',
    isTableRow: (node) => node.type.name === 'tableRow',
    isListItem: (node) => node.type.name === 'listItem',
    isDoc: (node) => node.type.name === 'doc',
    createOrderedListWithNode: (schema, droppedNode) => {
      return schema.nodes.orderedList?.createAndFill(null, droppedNode) || null;
    },
    dragHandleClassName: 'drag-handle',
    dragHandleHideClassName: 'hide',
    editorContentClassName: 'ProseMirror',
    editorContainerClassName: 'ProseMirror',
    editorDraggingClassName: 'dragging',
    notDraggableClassName: 'not-draggable',
    movableNodeSelectors: [],
    horizontalNodeOffset: 50,
    ...userOptions,
  };

  let listType = '';

  function handleDragStart(event: DragEvent, view: EditorView) {
    view.focus();

    if (!event.dataTransfer) return;

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

    if (!(node instanceof Element)) return;

    let draggedNodePos = nodePosAtDOM(node, view, options);
    if (draggedNodePos == null || draggedNodePos < 0) return;
    draggedNodePos = calcNodePos(draggedNodePos, view);

    const { from, to } = view.state.selection;
    const diff = from - to;

    const fromSelectionPos = calcNodePos(from, view);
    let differentNodeSelected = false;

    const nodePos = view.state.doc.resolve(fromSelectionPos);

    // Check if nodePos points to the top level node
    if (options.isDoc(nodePos.node())) {
      differentNodeSelected = true;
    } else {
      const nodeSelection = NodeSelection.create(
        view.state.doc,
        nodePos.before(),
      );

      // Check if the node where the drag event started is part of the current selection
      differentNodeSelected = !(
        draggedNodePos + 1 >= nodeSelection.$from.pos &&
        draggedNodePos <= nodeSelection.$to.pos
      );
    }

    let selection = view.state.selection;
    if (
      !differentNodeSelected &&
      diff !== 0 &&
      !(view.state.selection instanceof NodeSelection)
    ) {
      const endSelection = NodeSelection.create(view.state.doc, to - 1);
      selection = TextSelection.create(
        view.state.doc,
        draggedNodePos,
        endSelection.$to.pos,
      );
    } else {
      selection = NodeSelection.create(view.state.doc, draggedNodePos);

      // if inline node is selected, or table row is selected, go to the parent node to select the whole node
      const selectedNode = (selection as NodeSelection).node;
      if (selectedNode.type.isInline || options.isTableRow(selectedNode)) {
        const $pos = view.state.doc.resolve(selection.from);
        selection = NodeSelection.create(view.state.doc, $pos.before());
      }
    }
    view.dispatch(view.state.tr.setSelection(selection));

    // If the selected node is a list item, we need to save the type of the wrapping list e.g. OL or UL
    if (
      view.state.selection instanceof NodeSelection &&
      options.isListItem(view.state.selection.node) &&
      node.parentElement
    ) {
      listType = node.parentElement.tagName;
    }

    const slice = view.state.selection.content();
    const { dom, text } = __serializeForClipboard(view, slice);

    event.dataTransfer.clearData();
    event.dataTransfer.setData('text/html', dom.innerHTML);
    event.dataTransfer.setData('text/plain', text);
    event.dataTransfer.effectAllowed = 'copyMove';

    event.dataTransfer.setDragImage(node, 0, 0);
    view.dragging = { slice, move: event.ctrlKey };
  }
  let dragHandleElement: HTMLElement | null = null;

  function hideDragHandle() {
    dragHandleElement?.classList.add(options.dragHandleHideClassName);
  }

  function showDragHandle() {
    dragHandleElement?.classList.remove(options.dragHandleHideClassName);
  }

  function hideHandleOnEditorOut(event: MouseEvent) {
    if (event.target instanceof Element) {
      const relatedTarget = event.relatedTarget as HTMLElement;
      const isInsideEditor =
        relatedTarget?.classList.contains(options.editorContainerClassName) ||
        relatedTarget?.classList.contains(options.dragHandleClassName);

      if (isInsideEditor) return;
    }

    hideDragHandle();
  }

  return new Plugin({
    key: pluginKey,
    view: (view) => {
      const handleBySelector = options.dragHandleSelector
        ? document.querySelector<HTMLElement>(options.dragHandleSelector)
        : null;

      dragHandleElement = handleBySelector ?? createDragHandle();

      dragHandleElement.draggable = true;

      // This can be used by other nodeViews as seen here https://github.com/ueberdosis/tiptap/blob/d735cf3c758d52ecb2273e45cc0c9727dbf6eccd/packages/core/src/NodeView.ts#L165
      dragHandleElement.dataset.dragHandle = '';
      dragHandleElement.classList.add(options.dragHandleClassName);

      function onDragHandleDragStart(e: DragEvent) {
        handleDragStart(e, view);
      }

      dragHandleElement.addEventListener('dragstart', onDragHandleDragStart);

      function onDragHandleDrag(e: DragEvent) {
        hideDragHandle();
        const scrollY = window.scrollY;
        if (e.clientY < options.scrollTreshold) {
          window.scrollTo({ top: scrollY - 30, behavior: 'smooth' });
        } else if (window.innerHeight - e.clientY < options.scrollTreshold) {
          window.scrollTo({ top: scrollY + 30, behavior: 'smooth' });
        }
      }

      dragHandleElement.addEventListener('drag', onDragHandleDrag);

      hideDragHandle();

      if (!handleBySelector) {
        view.dom.parentElement?.appendChild(dragHandleElement);
      }
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
    props: {
      handleDOMEvents: {
        mousemove: (view, event) => {
          if (!view.editable) {
            return;
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
            // TODO why this
            .concat(['ol', 'ul'])
            .join(', ');

          if (
            !(node instanceof Element) ||
            node.matches(excludedTagList) ||
            notDragging
          ) {
            hideDragHandle();
            return;
          }
          //   console.log('node', node);
          const compStyle = window.getComputedStyle(node);
          const parsedLineHeight = Number.parseInt(compStyle.lineHeight, 10);
          const lineHeight = Number.isNaN(parsedLineHeight)
            ? Number.parseInt(compStyle.fontSize) * 1.2
            : parsedLineHeight;
          const paddingTop = Number.parseInt(compStyle.paddingTop, 10);

          const rect = absoluteRect(node);

          rect.top += (lineHeight - 24) / 2;
          rect.top += paddingTop;
          // Li markers
          // TODO task list config
          if (
            node.matches('ul:not([data-type=taskList]) li, ol li')
            // TODO make this configurable
          ) {
            rect.left -= options.dragHandleWidth;
          }
          rect.width = options.dragHandleWidth;

          if (!dragHandleElement) return;

          dragHandleElement.style.left = `${rect.left - rect.width}px`;
          dragHandleElement.style.top = `${rect.top}px`;
          showDragHandle();
        },
        keydown: () => {
          hideDragHandle();
        },
        mousewheel: () => {
          hideDragHandle();
        },
        dragenter: (view) => {
          view.dom.classList.add(options.editorDraggingClassName);
        },
        drop: (view, event) => {
          view.dom.classList.remove(options.editorDraggingClassName);
          hideDragHandle();
          let droppedNode: ProseMirrorNode | null = null;
          const dropPos = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });

          if (!dropPos) return;

          if (view.state.selection instanceof NodeSelection) {
            droppedNode = view.state.selection.node;
          }
          if (!droppedNode) return;

          const resolvedPos = view.state.doc.resolve(dropPos.pos);

          const isDroppedInsideList = options.isListItem(resolvedPos.parent);

          // If the selected node is a list item and is not dropped inside a list, and was originally from an OL,
          // we need to wrap it inside an orderedList node
          if (
            view.state.selection instanceof NodeSelection &&
            options.isListItem(view.state.selection.node) &&
            !isDroppedInsideList &&
            listType === ORDERED_LIST_TAG
          ) {
            const newList = options.createOrderedListWithNode(
              view.state.schema,
              droppedNode,
            );
            if (newList) {
              const slice = new Slice(Fragment.from(newList), 0, 0);
              view.dragging = {
                slice,
                move:
                  // TODO key
                  event.ctrlKey,
              };
            }
          }
        },
        dragend: (view) => {
          view.dom.classList.remove(options.editorDraggingClassName);
        },
      },
    },
  });
}
