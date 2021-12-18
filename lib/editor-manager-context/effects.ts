import { BangleEditor } from '@bangle.dev/core';

import { MAX_OPEN_EDITORS } from '@bangle.io/constants';
import { AppState } from '@bangle.io/create-store';
import { debounceFn } from '@bangle.io/utils';
import { workspaceContextKey } from '@bangle.io/workspace-context';

import {
  editorManagerSliceKey,
  FOCUS_EDITOR_ON_LOAD_COOLDOWN,
} from './constants';
import {
  forEachEditor,
  getEditor,
  someEditorChanged,
  updateInitialSelection,
  updateScrollPosition,
} from './operations';
import type { SideEffect } from './types';

export const initialSelectionEffect: SideEffect = () => {
  return {
    update(store, prevState) {
      // save the selection and scroll position of any editor that was closed
      for (let i = 0; i < MAX_OPEN_EDITORS; i++) {
        const currentEditor = getEditor(i)(store.state);
        const prevEditor = getEditor(i)(prevState);
        if (prevEditor && currentEditor !== prevEditor) {
          updateInitialSelection(i)(prevState, store.dispatch);
        }
      }
    },
  };
};

// This effect does:
// 1. Focus on the correct editor on initial mount.
// 2. Automatically focus on any new mounted editor thereafter.
// 3. If no current editor has any focus, focus on one automatically.
//
// We have a bit of complicated logic for the time period referred to as COOLDOWN.
// This is the time right after we mount the effect and lasts until `FOCUS_EDITOR_ON_LOAD_COOLDOWN`.
// During this time we want to only focus on the editorId mentioned in `focusedEditorId`
// and avoid focusing any other editor.
// Since we do not know when will the action for setting the editor
// at `focusedEditorId` will be dispatched we pause auto focusing on any new editorId
// other than the `focusedEditorId` for `FOCUS_EDITOR_ON_LOAD_COOLDOWN` milliseconds.
export const focusEditorEffect: SideEffect = (store) => {
  const initialSliceState = editorManagerSliceKey.getSliceState(store.state);

  // This exists to preserve focused editor during page reloads
  let editorNeedsFocusOnPageLoad: number | undefined =
    typeof initialSliceState?.focusedEditorId === 'number'
      ? initialSliceState?.focusedEditorId
      : 0;

  let mounted = Date.now();
  return {
    update(store, prevState) {
      // Only continue if an editor has been created or destroyed
      if (!someEditorChanged(prevState)(store.state)) {
        return;
      }

      const cooldown = Date.now() - mounted < FOCUS_EDITOR_ON_LOAD_COOLDOWN;

      for (let i = 0; i < MAX_OPEN_EDITORS; i++) {
        const currentEditor = getEditor(i)(store.state);
        const prevEditor = getEditor(i)(prevState);

        const isNewEditor =
          currentEditor &&
          !currentEditor.destroyed &&
          prevEditor !== currentEditor;

        if (editorNeedsFocusOnPageLoad === i && isNewEditor) {
          currentEditor.focusView();
          editorNeedsFocusOnPageLoad = undefined;
          return;
        }

        // We have a black out time in which we
        // do not attempt to focus on any newly mounted editor.
        // This is so as to avoid competing with the `editorNeedsFocusOnPageLoad`.
        if (!editorNeedsFocusOnPageLoad && isNewEditor && !cooldown) {
          currentEditor.focusView();
          return;
        }
      }

      if (cooldown) {
        return;
      }

      // If we we reach here check if none of the opened
      // editor has focus and focus one of them if needed.
      let someEditorHasFocus = false;
      let editorToFocus: BangleEditor | undefined;

      forEachEditor((editor) => {
        if (editor?.view.hasFocus()) {
          someEditorHasFocus = true;
        }
        if (editor?.destroyed === false) {
          editorToFocus = editor;
        }
      })(store.state);

      if (!someEditorHasFocus) {
        editorToFocus?.focusView();
      }
    },
  };
};

// Preserve the scroll state when editors unmount
// note: we cannot simply update the scroll position when editor unmounts
// like selection because the dom is no longer having height when the editor
// unmounts
export const watchEditorScrollEffect: SideEffect = (store) => {
  const updateScrollPos = () => {
    for (let i = 0; i < MAX_OPEN_EDITORS; i++) {
      const currentEditor = getEditor(i)(store.state);
      if (!currentEditor?.destroyed) {
        updateScrollPosition(i)(store.state, store.dispatch);
      }
    }
  };

  const deb = debounceFn(updateScrollPos, {
    wait: 100,
    maxWait: 300,
  });

  const opts = {
    capture: true,
    passive: true,
  };
  const isWindow = typeof window !== 'undefined';

  if (isWindow) {
    window.addEventListener('scroll', deb, opts);
  }

  return {
    destroy() {
      deb.cancel();
      if (isWindow) {
        window.removeEventListener('scroll', deb, opts);
      }
    },
  };
};
