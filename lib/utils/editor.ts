import { findWrappingScrollable } from './utility';

export function getScrollParentElement(editorId: number) {
  const editor = document.querySelector('.editor-container_editor-' + editorId);

  if (editor) {
    return findWrappingScrollable(editor);
  }

  return undefined;
}
