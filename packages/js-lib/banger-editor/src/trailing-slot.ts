import { Decoration, type EditorView, type PMNode } from './pm';

/**
 * Shared styling hook for widgets that flow inline at the end of a block's
 * text (fold toggles, future badges/affordances). The slot participates in
 * inline layout, so on a wrapped block it sits at the end of the last line.
 */
export const BLOCK_TRAILING_SLOT_CLASS = 'B-block-trailing-slot';

/**
 * Builds a widget decoration anchored at the end of a textblock's inline
 * content. Multiple features may each attach their own trailing widget to
 * the same block: the decorations render side by side, in the order they
 * are supplied, and share spacing via BLOCK_TRAILING_SLOT_CLASS.
 *
 * `render` returns the widget's content; returning null renders an empty
 * slot. The slot itself is non-editable and invisible to the selection.
 */
export function createTrailingWidget({
  node,
  pos,
  key,
  render,
}: {
  /** The block node the widget trails. */
  node: PMNode;
  /** Position right before `node`. */
  pos: number;
  /** Stable widget identity; include anything that should force a redraw. */
  key: string;
  render: (view: EditorView) => HTMLElement | null;
}): Decoration {
  return Decoration.widget(
    pos + node.nodeSize - 1,
    (view: EditorView) => {
      const slot = document.createElement('span');
      slot.className = BLOCK_TRAILING_SLOT_CLASS;
      slot.contentEditable = 'false';
      const content = render(view);
      if (content) {
        slot.appendChild(content);
      }
      return slot;
    },
    {
      key,
      side: 1,
      ignoreSelection: true,
      relaxedSide: true,
      stopEvent: isTrailingSlotEvent,
    },
  );
}

function isTrailingSlotEvent(event: Event): boolean {
  return (
    event.type === 'mousedown' ||
    event.type === 'pointerdown' ||
    event.type === 'touchstart' ||
    event.type === 'click'
  );
}
