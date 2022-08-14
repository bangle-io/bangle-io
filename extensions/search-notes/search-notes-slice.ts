import { search } from '@bangle.dev/search';

import { editor, Slice, workspace } from '@bangle.io/api';
import { assertActionName, isAbortError } from '@bangle.io/utils';

import type { SearchNotesExtensionState } from './constants';
import {
  extensionName,
  searchNotesSliceKey,
  searchPluginKey,
} from './constants';
import { searchNotes } from './search-notes';

export function searchNotesSlice() {
  assertActionName(extensionName, searchNotesSliceKey);

  return new Slice({
    key: searchNotesSliceKey,
    state: {
      init() {
        return {
          searchQuery: '',
          externalInputChange: 0,
          pendingSearch: false,
          searchResults: null,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/search-notes:input-search-query': {
            return {
              ...state,
              searchQuery: action.value.query,
            };
          }
          case 'action::@bangle.io/search-notes:external-search-query-update': {
            return {
              ...state,
              searchQuery: action.value.query,
              externalInputChange: state.externalInputChange + 1,
            };
          }
          case 'action::@bangle.io/search-notes:update-state': {
            return {
              ...state,
              ...action.value,
            };
          }
          default: {
            return state;
          }
        }
      },
    },
    sideEffect: [wsNameEffect, searchEffect, highlightEditorsEffect],
  });
}
const wsNameEffect = searchNotesSliceKey.effect(() => {
  return {
    deferredUpdate(store, prevState) {
      if (
        workspace.workspaceSliceKey.valueChanged(
          'wsName',
          store.state,
          prevState,
        )
      ) {
        updateSliceState({
          searchResults: null,
          pendingSearch: false,
        })(store.state, store.dispatch);
      }
    },
  };
});

const searchEffect = searchNotesSliceKey.effect(() => {
  let controller = new AbortController();

  return {
    deferredUpdate(store, prevState) {
      const searchQuery = searchNotesSliceKey.getValueIfChanged(
        'searchQuery',
        store.state,
        prevState,
      );

      if (searchQuery == null) {
        return;
      }

      const wsName = workspace.workspaceSliceKey.callOp(
        store.state,
        store.dispatch,
        workspace.getWsName(),
      );

      if (!wsName) {
        return;
      }

      controller?.abort();
      controller = new AbortController();

      if (searchQuery === '') {
        updateSliceState({
          searchResults: null,
          pendingSearch: false,
        })(store.state, store.dispatch);

        return;
      }

      updateSliceState({ searchResults: null, pendingSearch: true })(
        store.state,
        store.dispatch,
      );

      searchNotes(controller.signal, searchQuery, wsName)
        .then((result) => {
          // make sure it is the same workspace name
          if (
            !controller.signal.aborted &&
            wsName ===
              workspace.workspaceSliceKey.callOp(
                store.state,
                store.dispatch,
                workspace.getWsName(),
              )
          ) {
            updateSliceState({ searchResults: result, pendingSearch: false })(
              store.state,
              store.dispatch,
            );
          }
        })
        .catch((error) => {
          if (isAbortError(error)) {
            return;
          }

          updateSliceState({ pendingSearch: false })(
            store.state,
            store.dispatch,
          );

          throw error;
        });
    },
  };
});

/**
 * Highlights open editors based on the current search query
 */
const highlightEditorsEffect = searchNotesSliceKey.effect(() => {
  return {
    deferredUpdate(store, prevState) {
      const searchQuery = searchNotesSliceKey.getValueIfChanged(
        'searchQuery',
        store.state,
        prevState,
      );

      if (searchQuery == null) {
        return;
      }

      editor.forEachEditor((editor) => {
        if (editor?.destroyed === false) {
          const queryRegex = searchQuery
            ? new RegExp(
                searchQuery.replace(/[-[\]{}()*+?.,\\^$|]/g, '\\$&'),
                'i',
              )
            : undefined;
          search.updateSearchQuery(searchPluginKey, queryRegex)(
            editor.view.state,
            editor.view.dispatch,
          );
        }
      })(store.state);
    },
  };
});

export function updateInputSearchQuery(query: string) {
  return searchNotesSliceKey.op((state, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/search-notes:input-search-query',
      value: { query },
    });
  });
}

export function externalUpdateInputSearchQuery(query: string) {
  return searchNotesSliceKey.op((state, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/search-notes:external-search-query-update',
      value: { query },
    });
  });
}

export function updateSliceState(
  val: Omit<Partial<SearchNotesExtensionState>, 'searchQuery'>,
) {
  return searchNotesSliceKey.op((state, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/search-notes:update-state',
      value: val,
    });
  });
}
