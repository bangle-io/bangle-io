import {
  PRIMARY_SCROLL_PARENT_ID,
  SECONDARY_SCROLL_PARENT_ID,
} from 'constants';

export function getScrollParentElement(editorId: number) {
  let scrollParent: Element | undefined | null;
  if (editorId === 0) {
    scrollParent = document.querySelector('#' + PRIMARY_SCROLL_PARENT_ID);
  } else if (editorId === 1) {
    scrollParent = document.querySelector('#' + SECONDARY_SCROLL_PARENT_ID);
  }
  // when editor is in mobile mode
  if (scrollParent == null) {
    scrollParent = document.scrollingElement;
  }
  return scrollParent;
}
