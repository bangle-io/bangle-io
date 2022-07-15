import type { BangleEditor } from '@bangle.dev/core';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import { pageLifeCycleTransitionedTo } from '@bangle.io/slice-page';
import { debounceFn, trimEndWhiteSpaceBeforeCursor } from '@bangle.io/utils';

import {
  editorManagerSliceKey,
  FOCUS_EDITOR_ON_LOAD_COOLDOWN,
} from './constants';
import {
  didSomeEditorChange,
  forEachEditor,
  getEditor,
  updateInitialSelection,
  updateScrollPosition,
} from './operations';
import { getEachEditorIterable } from './utils';

export const initialSelectionEffect = editorManagerSliceKey.effect(() => {
  return {
    update(store, prevState) {
      // save the selection and scroll position of any editor that was closed
      for (const { editor: currentEditor, editorId } of getEachEditorIterable(
        editorManagerSliceKey.getSliceStateAsserted(store.state),
      )) {
        const prevEditor = getEditor(editorId)(prevState);

        if (prevEditor && currentEditor !== prevEditor) {
          updateInitialSelection(editorId)(prevState, store.dispatch);
        }
      }
    },
  };
});

// This effect does:
// 1. Focus on the correct editor on initial mount.
// 2. Automatically focus on any new mounted editor thereafter.
// 3. If no current editor has any focus, focus on one automatically.
//
// We have a bit of complicated logic for the time period referred to as cooldown period.
// This is the time right after we mount the effect and lasts until `FOCUS_EDITOR_ON_LOAD_COOLDOWN`.
// During this time we want to only focus on the editorId mentioned in `focusedEditorId`
// and avoid focusing any other editor.
// Since we do not know when will the action for setting the editor
// at `focusedEditorId` will be dispatched we pause auto focusing on any other editorId
// for the cooldown period.
export const focusEditorEffect = editorManagerSliceKey.effect((state) => {
  const initialSliceState = editorManagerSliceKey.getSliceState(state);

  // This exists to preserve focused editor during page reloads
  let defaultFocusedEditorId =
    initialSliceState?.focusedEditorId == null
      ? PRIMARY_EDITOR_INDEX
      : initialSliceState.focusedEditorId;

  let initialFocusDone = false;
  let mounted = Date.now();

  return {
    update(store, prevState) {
      // // Only continue if an editor has been created or destroyed
      if (prevState && !didSomeEditorChange(prevState)(store.state)) {
        return;
      }

      const cooldown = Date.now() - mounted < FOCUS_EDITOR_ON_LOAD_COOLDOWN;

      for (const { editor: currentEditor, editorId } of getEachEditorIterable(
        editorManagerSliceKey.getSliceStateAsserted(store.state),
      )) {
        const prevEditor = prevState && getEditor(editorId)(prevState);

        const isNewEditor =
          currentEditor &&
          !currentEditor.destroyed &&
          prevEditor !== currentEditor;

        if (
          defaultFocusedEditorId === editorId &&
          isNewEditor &&
          !initialFocusDone
        ) {
          currentEditor.focusView();
          initialFocusDone = true;

          return;
        }

        // do not attempt to focus on any newly mounted editor, if conditions do not match
        // This is so as to avoid competing with the `editorNeedsFocusOnPageLoad`.
        if (initialFocusDone && isNewEditor && !cooldown) {
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
});

// Preserve the scroll state when editors unmount
// note: we cannot simply update the scroll position when editor unmounts
// like selection because the dom is no longer having height when the editor
// unmounts
export const watchEditorScrollEffect = editorManagerSliceKey.effect(() => {
  return {
    deferredOnce(store, abortSignal) {
      const updateScrollPos = () => {
        for (const { editor: currentEditor, editorId } of getEachEditorIterable(
          editorManagerSliceKey.getSliceStateAsserted(store.state),
        )) {
          if (!currentEditor?.destroyed) {
            updateScrollPosition(editorId)(store.state, store.dispatch);
          }
        }
      };

      const deb = debounceFn(updateScrollPos, {
        wait: 300,
        maxWait: 600,
      });

      const opts = {
        capture: true,
        passive: true,
      };
      const isWindow = typeof window !== 'undefined';

      if (isWindow) {
        window.addEventListener('scroll', deb, opts);
      }

      abortSignal.addEventListener(
        'abort',
        () => {
          deb.cancel();

          if (isWindow) {
            window.removeEventListener('scroll', deb, opts);
          }
        },
        {
          once: true,
        },
      );
    },
  };
});

export const trimWhiteSpaceEffect = editorManagerSliceKey.effect(() => {
  return {
    update: (store, prevState) => {
      const pageTransitioned = pageLifeCycleTransitionedTo(
        ['passive', 'hidden'],
        prevState,
      )(store.state);

      if (pageTransitioned) {
        forEachEditor((editor) => {
          if (!editor?.destroyed && editor?.view.hasFocus()) {
            // To avoid cursor jumping across due markdown whitespace elimination
            // this removes the white space to prevent cursor jumping.
            // Not ideal though
            trimEndWhiteSpaceBeforeCursor()(
              editor.view.state,
              editor.view.dispatch,
            );
          }
        })(store.state);
      }
    },
  };
});
