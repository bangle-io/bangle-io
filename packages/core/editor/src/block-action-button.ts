import type { EditorView } from 'prosemirror-view';

/**
 * Shared chrome for the action buttons that live in a block's header band
 * (code block copy/delete, frontmatter delete). One factory so every block
 * action gets identical event handling. Buttons remain in normal tab order
 * for keyboard access, while their pointer and keyboard events stay inside
 * widget chrome instead of leaking into ProseMirror's document keymap.
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
  onClick: () => void | Promise<void>;
}): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.tabIndex = 0;

  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  let skipKeyboardClick = false;
  const activateFromKeyboard = () => {
    // Browsers normally suppress the button's synthetic click when the key
    // event is cancelled. Keep this guard for contenteditable widget hosts
    // that still dispatch one, so the action runs exactly once.
    skipKeyboardClick = true;
    void onClick();
    // A cancelled key normally produces no click. Clear the guard after this
    // event turn so a later assistive-technology or programmatic detail-zero
    // click remains an independent activation.
    queueMicrotask(() => {
      skipKeyboardClick = false;
    });
  };

  button.addEventListener('mousedown', swallow);
  button.addEventListener('pointerdown', swallow);
  button.addEventListener('touchstart', swallow);
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      swallow(event);
      if (!event.repeat) {
        activateFromKeyboard();
      }
      return;
    }
    if (event.key === ' ') {
      // Space activates a native button on keyup. Cancelling keydown also
      // stops the editable host from inserting a space into the document.
      swallow(event);
      return;
    }
    event.stopPropagation();
  });
  button.addEventListener('keyup', (event) => {
    if (event.key === ' ') {
      swallow(event);
      activateFromKeyboard();
      return;
    }
    event.stopPropagation();
  });
  button.addEventListener('click', (event) => {
    swallow(event);
    if (skipKeyboardClick && event.detail === 0) {
      skipKeyboardClick = false;
      return;
    }
    skipKeyboardClick = false;
    void onClick();
  });

  return button;
}

/**
 * Marks a widget wrapper as editor chrome: interface elements (language
 * badges, copy/delete buttons, ...) that render inside the editable content
 * DOM but are not document content. Chrome must be non-editable so
 * ProseMirror never places the cursor in it, and it carries
 * `data-editor-chrome` so text extraction (tests, tooling) can exclude it —
 * document text offsets must never depend on when chrome happens to render.
 */
export function markEditorChrome(element: HTMLElement): void {
  element.contentEditable = 'false';
  element.dataset.editorChrome = 'true';
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
    event.type === 'click' ||
    event.type === 'keydown' ||
    event.type === 'keyup'
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
