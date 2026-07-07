import type { EditorView } from 'prosemirror-view';

/**
 * Shared chrome for the action buttons that live in a block's header band
 * (code block copy/delete, frontmatter delete). One factory so every block
 * action gets identical event handling: pointer events are swallowed before
 * ProseMirror can move the selection into the block.
 */
export function createBlockActionButton({
  className,
  text,
  label,
  onClick,
}: {
  className: string;
  text: string;
  label: string;
  onClick: () => void;
}): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.tabIndex = -1;

  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  button.addEventListener('mousedown', swallow);
  button.addEventListener('pointerdown', swallow);
  button.addEventListener('touchstart', swallow);
  button.addEventListener('click', (event) => {
    swallow(event);
    onClick();
  });

  return button;
}

/**
 * Events a block-action widget handles itself; ProseMirror must not treat
 * them as editor interactions. Used as the widget decoration's `stopEvent`.
 */
export function isBlockActionEvent(event: Event): boolean {
  return (
    event.type === 'mousedown' ||
    event.type === 'pointerdown' ||
    event.type === 'touchstart' ||
    event.type === 'click'
  );
}

/**
 * Deletes the block node of the given type at `pos`, guarding against stale
 * widget positions after the doc changed under the button.
 */
export function deleteBlockAt(
  editorView: EditorView,
  pos: number | undefined,
  typeName: string,
): void {
  if (editorView.isDestroyed || pos === undefined) {
    return;
  }
  const node = editorView.state.doc.nodeAt(pos);
  if (node?.type.name !== typeName) {
    return;
  }
  editorView.dispatch(
    editorView.state.tr.delete(pos, pos + node.nodeSize).scrollIntoView(),
  );
  editorView.focus();
}
