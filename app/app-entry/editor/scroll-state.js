import { useEffect } from 'react';

export function getScrollParentElement(editorId) {
  let scrollParent;
  if (editorId === 0) {
    scrollParent = document.querySelector('#primary-editor-scroll-parent');
  } else if (editorId === 1) {
    scrollParent = document.querySelector('#secondary-editor-scroll-parent');
  }
  // when editor is in mobile mode
  if (scrollParent == null) {
    scrollParent = document.scrollingElement;
  }

  return scrollParent;
}

function saveScrollState(editorId, wsPath) {
  const key = 'scroll::' + wsPath;
  const scrollParent = getScrollParentElement(editorId);
  if (scrollParent) {
    const scrollTop = scrollParent.scrollTop;
    sessionStorage.setItem(key, scrollTop);
  }
}

function restoreScrollState(editorId, wsPath) {
  const key = 'scroll::' + wsPath;
  const scrollParent = getScrollParentElement(editorId);
  if (scrollParent) {
    const scrollTop = parseInt(sessionStorage.getItem(key), 10);
    if (scrollTop && !Number.isNaN(scrollTop)) {
      scrollParent.scrollTop = scrollTop;
      sessionStorage.removeItem(key);
    }
  }
}

export function usePreserveScroll(editorId, wsPath, editorContentLoaded) {
  useEffect(() => {
    if (editorContentLoaded) {
      restoreScrollState(editorId, wsPath);
    }
    return () => {
      if (editorContentLoaded) {
        saveScrollState(editorId, wsPath);
      }
    };
  }, [editorId, wsPath, editorContentLoaded]);
}
