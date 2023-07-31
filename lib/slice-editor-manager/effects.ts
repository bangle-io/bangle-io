import { search } from '@bangle.dev/search';

import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import {
  getEditorPluginMetadata,
  searchPluginKey,
} from '@bangle.io/editor-common';
import { cleanup, effect, ref } from '@bangle.io/nsm-3';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { nsmUISlice } from '@bangle.io/slice-ui';
import { debounceFn, trimEndWhiteSpaceBeforeCursor } from '@bangle.io/utils';

import {
  incrementDisableEditingCounter,
  updateScrollPosition,
  updateSelection,
} from './actions';
import { forEachEditor, nsmEditorManagerSlice, someEditor } from './slice';
import { calculateSelection, getScrollParentElement } from './utils';

const watchScrollPos = effect(function watchScrollPos(store) {
  const updateScrollPos = () => {
    const { mainEditors } = nsmEditorManagerSlice.get(store.state);
    for (const editor of mainEditors) {
      if (!editor) {
        continue;
      }
      const { editorId, wsPath } = getEditorPluginMetadata(editor.view.state);

      if (editorId == null) {
        return;
      }

      const top = getScrollParentElement(editorId)?.scrollTop;

      if (typeof top !== 'number') {
        return;
      }

      store.dispatch(
        updateScrollPosition({
          editorId,
          scrollPosition: top,
          wsPath,
        }),
      );
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

  cleanup(store, () => {
    deb.cancel();

    if (isWindow) {
      window.removeEventListener('scroll', deb, opts);
    }
  });
});

const checkForInactiveEditor = effect(function checkForInactiveEditor(store) {
  let timer: NodeJS.Timeout | undefined;
  const intervalId = setInterval(
    () => {
      if (timer) {
        clearTimeout(timer);
      }

      if (!nsmUISlice.get(store.state).widescreen) {
        const { editingAllowed } = nsmEditorManagerSlice.get(store.state);

        if (editingAllowed) {
          timer = setTimeout(() => {
            store.dispatch(incrementDisableEditingCounter());
          }, 300);
        }
      }
    },
    // WARNING: do not reduce the interval below 500 as it can prevent manual toggling
    // of editing.
    // WARNING: when changing time, make sure to account for sleep time below
    500,
  );

  cleanup(store, () => {
    if (timer) {
      clearTimeout(timer);
    }
    clearInterval(intervalId);
  });
});

const toggleEditingEffect = effect(function toggleEditingEffect(store) {
  void nsmPageSlice.track(store).isInactivePage;

  const { disableEditingCounter } = nsmEditorManagerSlice.track(store);
  const { widescreen } = nsmUISlice.track(store);

  const { mainEditors, editingAllowed } = nsmEditorManagerSlice.get(
    store.state,
  );

  if (widescreen || disableEditingCounter === undefined) {
    return;
  }

  const noEditorInFocus = !someEditor(mainEditors, (editor) =>
    editor.view.hasFocus(),
  );

  // TODO this isn't working and is always disabling editor
  // if (noEditorInFocus || state.isInactivePage) {
  //   if (noEditorInFocus) {
  //     console.warn('disabling editing due to no editor in focus');
  //   }
  //   if (state.isInactivePage) {
  //     console.warn('disabling editing due to inactive page');
  //   }
  //   dispatch(
  //     toggleEditingDirect(
  //       {
  //         editingAllowed: state.editingAllowed,
  //         mainEditors: state.mainEditors,
  //       },
  //       { editingAllowed: false },
  //     ),
  //   );
  // }
});

const initialSelectionEffect = effect(function initialSelectionEffect(store) {
  const { mainEditors } = nsmEditorManagerSlice.track(store);

  for (const [index, editor] of mainEditors.entries()) {
    if (!editor) {
      continue;
    }
    const value = calculateSelection(index, editor);
    store.dispatch(updateSelection(value));
  }
});

const trimWhiteSpaceEffect = effect(function trimWhiteSpaceEffect(store) {
  const { mainEditors } = nsmEditorManagerSlice.get(store.state);
  const { isInactivePage } = nsmPageSlice.track(store);

  if (isInactivePage) {
    for (const editor of mainEditors) {
      if (!editor) {
        continue;
      }
      trimEndWhiteSpaceBeforeCursor()(editor.view.state, editor.view.dispatch);
    }
  }
});

const setEditorSearchQueryEffect = effect(function setEditorSearchQueryEffect(
  store,
) {
  const { searchQuery } = nsmEditorManagerSlice.track(store);

  forEachEditor(store.state, (editor) => {
    search.updateSearchQuery(searchPluginKey, searchQuery)(
      editor.view.state,
      editor.view.dispatch,
    );
  });
});

const clearEditorSearchQueryEffect = effect(
  function clearEditorSearchQueryEffect(store) {
    void nsmPageSlice.track(store).wsName;

    forEachEditor(store.state, (editor) => {
      search.updateSearchQuery(searchPluginKey, undefined)(
        editor.view.state,
        editor.view.dispatch,
      );
    });
  },
);

const getFocusedOnMountRef = ref(() => ({
  focusedOnMount: false,
}));

// This effect does:
// 1. Focus on the correct editor on initial mount.
// 2. Automatically focus on any new mounted editor thereafter.
// 3. If no current editor has any focus, focus on one automatically.
const focusEffect = effect(
  function focusEffect(store) {
    const { lastOpenedEditor } = nsmEditorManagerSlice.track(store);

    const { focusedEditorId, mainEditors } = nsmEditorManagerSlice.get(
      store.state,
    );
    const { primaryWsPath, secondaryWsPath } = nsmPageSlice.get(store.state);

    const focusedRef = getFocusedOnMountRef(store);

    if (primaryWsPath == null && secondaryWsPath == null) {
      return;
    }

    const isPrimaryReady = Boolean(
      primaryWsPath ? mainEditors[PRIMARY_EDITOR_INDEX] : true,
    );
    const isSecondaryReady = Boolean(
      secondaryWsPath ? mainEditors[SECONDARY_EDITOR_INDEX] : true,
    );

    if (!isPrimaryReady && !isSecondaryReady) {
      return;
    }
    // if we have already focused on mount, then we can continue focusing
    // on the last opened editor
    if (focusedRef.current.focusedOnMount) {
      lastOpenedEditor?.editor.focusView();

      return;
    }

    if (isPrimaryReady && isSecondaryReady) {
      focusedRef.current.focusedOnMount = true;

      if (typeof focusedEditorId === 'number') {
        // if mounting for the first time, focus on the focusedEditorId
        mainEditors[focusedEditorId]?.focusView();
      } else {
        lastOpenedEditor?.editor.focusView();
      }
    }
  },
  { deferred: false },
);

export const nsmEditorEffects = [
  watchScrollPos,
  checkForInactiveEditor,
  toggleEditingEffect,
  initialSelectionEffect,
  trimWhiteSpaceEffect,
  focusEffect,
  setEditorSearchQueryEffect,
  clearEditorSearchQueryEffect,
];
