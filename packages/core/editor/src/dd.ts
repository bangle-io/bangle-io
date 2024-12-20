import type { ProseMirrorNode } from '@prosekit/pm/model';
import { Fragment, Slice } from '@prosekit/pm/model';
import type { EditorState } from '@prosekit/pm/state';
import { Plugin, PluginKey } from '@prosekit/pm/state';
import type { Transaction } from '@prosekit/pm/state';
import { Decoration, DecorationSet } from '@prosekit/pm/view';
import type { EditorView } from '@prosekit/pm/view';
import { atom, createStore, useAtom } from 'jotai';

/**
 * Type definition for the createCustomElement function.
 * It takes a ProseMirror node and returns an HTMLElement or null.
 */
type CreateCustomElement = (node: ProseMirrorNode) => HTMLElement | null;

/**
 * Plugin options interface.
 */
interface CustomElementPluginOptions {
  createCustomElement: CreateCustomElement;
}

/**
 * A dedicated plugin key for the custom element plugin
 */
const customElementPluginKey = new PluginKey<DecorationSet>(
  'customElementPlugin',
);

/**
 * Creates a ProseMirror plugin that inserts a custom element at the start of each block node.
 *
 * @param createCustomElement - A function that returns the custom DOM element.
 * @param options - Additional options for the plugin.
 * @returns The ProseMirror plugin.
 */
export function customElementPlugin(
  createCustomElement: CreateCustomElement,
  _options: Partial<CustomElementPluginOptions> = {},
): Plugin {
  const getDecorations = (doc: ProseMirrorNode): DecorationSet => {
    const decorations: Decoration[] = [];

    doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (!node.isBlock) return;

      const customEl = createCustomElement(node);
      if (customEl) {
        // Position the widget at the start of the node (pos + 1 to skip the node's start)
        const deco = Decoration.widget(pos + 1, customEl, {
          side: -1,
          key: `${pos}`,
        });
        decorations.push(deco);
      }
    });

    return DecorationSet.create(doc, decorations);
  };

  return new Plugin({
    key: customElementPluginKey,
    state: {
      init(_, state) {
        return getDecorations(state.doc);
      },
      apply(tr: Transaction, oldDecorationSet: DecorationSet) {
        if (tr.docChanged) {
          return getDecorations(tr.doc);
        }
        return oldDecorationSet.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state: EditorState) {
        return this.getState(state) ?? null;
      },
    },
  });
}

export function createCustomElement(node: ProseMirrorNode): HTMLElement | null {
  // Example: Insert custom element only for paragraph nodes
  if (node.type.name !== 'paragraph') {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className =
    'inline-flex items-center justify-center bg-blue-500 text-white rounded cursor-move';
  wrapper.draggable = true;

  // Add fixed positioning styles
  wrapper.style.position = 'absolute';
  wrapper.style.transform = 'translateX(-40px)';
  wrapper.style.marginTop = '3px'; // small top margin for alignment

  // Example content: SVG icon
  wrapper.innerHTML = `
    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  `;

  return wrapper;
}

interface DragState {
  dragging: boolean;
  startPos: number;
  targetPos: number | null;
  slice: Slice | null;
}

const initialDragState: DragState = {
  dragging: false,
  startPos: 0,
  targetPos: null,
  slice: null,
};

// Create a Jotai store for our drag and drop state
const dragAndDropStore = createStore();
const dragStateAtom = atom<DragState>(initialDragState);

// A separate plugin key for the drag and drop plugin
const dragAndDropPluginKey = new PluginKey<DragState>('dragAndDropPlugin');

export function useDragAndDropPluginState() {
  return useAtom(dragStateAtom, { store: dragAndDropStore });
}

export function createDragAndDropPlugin(): Plugin {
  const handleDragStart = (view: EditorView, event: DragEvent): boolean => {
    if (!event.clientX || !event.clientY) {
      return false;
    }

    const coords = { left: event.clientX, top: event.clientY };
    const pos = view.posAtCoords(coords)?.pos;

    if (pos === undefined) {
      return false;
    }

    const resolvedPos = view.state.doc.resolve(pos);
    const node = view.state.doc.nodeAt(resolvedPos.before(1));
    if (!node) return false;

    const dragHandle = event.target;
    if (
      !(
        dragHandle instanceof HTMLElement &&
        dragHandle.className.includes('cursor-move')
      )
    ) {
      return false;
    }

    const decorationSet = customElementPluginKey.getState(view.state);
    if (!decorationSet) {
      return false;
    }

    // Find the decoration at or near the current position
    const decorations = decorationSet.find(pos - 1, pos + 1);
    const decoration = decorations[0];

    if (!decoration || pos !== decoration.from) {
      return false;
    }

    // Create a slice containing the node being dragged
    const slice = new Slice(
      Fragment.from(node),
      resolvedPos.depth - 1,
      resolvedPos.depth - 1,
    );

    dragAndDropStore.set(dragStateAtom, {
      dragging: true,
      startPos: resolvedPos.before(1),
      targetPos: null,
      slice,
    });

    const dataTransfer = event.dataTransfer;
    if (dataTransfer) {
      dataTransfer.effectAllowed = 'move';
      dataTransfer.setData('text/plain', node.textContent ?? '');
      const dom = view.nodeDOM(resolvedPos.before(1));
      if (dom instanceof HTMLElement) {
        dataTransfer.setDragImage(dom, 0, 0);
      }
    }

    return true;
  };

  const handleDragOver = (view: EditorView, event: DragEvent): boolean => {
    // Prevent default to allow drop
    event.preventDefault();

    if (!event.clientX || !event.clientY) {
      return false;
    }

    const pos = view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    })?.pos;

    if (pos === undefined) {
      return false;
    }

    const state = dragAndDropStore.get(dragStateAtom);
    if (!state?.dragging || !state.slice) return false;

    const targetPos = pos;

    // Prevent dropping on itself
    if (
      targetPos === state.startPos ||
      targetPos === state.startPos + state.slice.content.size
    ) {
      return true;
    }

    // Update the target position if it changed
    if (state.targetPos !== targetPos) {
      dragAndDropStore.set(dragStateAtom, {
        ...state,
        targetPos,
      });
    }

    return true;
  };

  const handleDrop = (view: EditorView, event: DragEvent): boolean => {
    event.preventDefault();

    const state = dragAndDropStore.get(dragStateAtom);
    if (!state?.dragging) return false;

    const { startPos, targetPos, slice } = state;
    if (targetPos === null || slice === null) {
      return false;
    }

    const tr = view.state.tr;
    const insertPos = targetPos;

    // Remove the original and insert at the target position
    tr.delete(startPos, startPos + slice.content.size);
    tr.insert(insertPos, slice.content);
    view.dispatch(tr);

    dragAndDropStore.set(dragStateAtom, initialDragState);
    event.dataTransfer?.clearData();
    return true;
  };

  const handleDragEnd = (_view: EditorView, _event: DragEvent): boolean => {
    const state = dragAndDropStore.get(dragStateAtom);
    if (!state?.dragging) return false;

    dragAndDropStore.set(dragStateAtom, initialDragState);
    return true;
  };

  return new Plugin({
    key: dragAndDropPluginKey,
    state: {
      init: () => initialDragState,
      apply(tr, value: DragState) {
        const meta = tr.getMeta(dragAndDropPluginKey);
        if (meta) {
          return meta;
        }
        return value;
      },
    },
    props: {
      handleDOMEvents: {
        dragstart: handleDragStart,
        dragover: handleDragOver,
        drop: handleDrop,
        dragend: handleDragEnd,
      },
    },
  });
}
