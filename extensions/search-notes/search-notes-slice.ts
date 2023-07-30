import { nsm, nsmApi2 } from '@bangle.io/api';
import { isAbortError } from '@bangle.io/mini-js-utils';

import type { SearchNotesExtensionState } from './constants';
import { searchNotes } from './search-notes';

const initState: SearchNotesExtensionState = {
  searchQuery: '',
  externalInputChange: 0,
  pendingSearch: false,
  searchResults: null,
};

export const SLICE_NAME = 'slice::search-notes:main';

export const searchSlice = nsm.slice([], {
  name: SLICE_NAME,
  state: initState,
});

export const updateSearchQuery = searchSlice.action(
  function updateSearchQuery(data: { query: string }) {
    return searchSlice.tx((state) => {
      return searchSlice.update(state, {
        searchQuery: data.query,
      });
    });
  },
);

export const updateExternalSearchQuery = searchSlice.action(
  function updateExternalSearchQuery(query: string) {
    return searchSlice.tx((state) => {
      return searchSlice.update(state, (sliceState) => {
        return {
          searchQuery: query,
          externalInputChange: sliceState.externalInputChange + 1,
        };
      });
    });
  },
);

export const updateSliceState = searchSlice.action(function updateSliceState(
  data: Omit<Partial<SearchNotesExtensionState>, 'searchQuery'>,
) {
  return searchSlice.tx((state) => {
    return searchSlice.update(state, data);
  });
});

const wsNameEffect = nsm.effect(function wsNameEffect(store) {
  void nsmApi2.workspace.trackWorkspaceName(store);

  store.dispatch(
    updateSliceState({
      searchResults: null,
      pendingSearch: false,
    }),
  );
});

const searchEffect = nsm.effect(function searchEffect(store) {
  const wsName = nsmApi2.workspace.trackWorkspaceName(store);

  const { searchQuery } = searchSlice.track(store);

  if (!wsName) {
    return;
  }

  if (searchQuery === '') {
    store.dispatch(
      updateSliceState({ searchResults: null, pendingSearch: false }),
    );

    return;
  }

  store.dispatch(
    updateSliceState({ searchResults: null, pendingSearch: true }),
  );

  let controller = new AbortController();

  nsm.cleanup(store, () => {
    controller.abort();
  });

  searchNotes(controller.signal, searchQuery, wsName)
    .then((result) => {
      if (!controller.signal.aborted) {
        store.dispatch(
          updateSliceState({ searchResults: result, pendingSearch: false }),
        );
      } else {
        console.warn('Search aborted', result);
      }
    })
    .catch((error) => {
      if (isAbortError(error)) {
        return;
      }
      store.dispatch(updateSliceState({ pendingSearch: false }));

      throw error;
    });
});

const highlightEditorsEffect = nsm.effect(function highlightEditorsEffect(
  store,
) {
  const { searchQuery } = searchSlice.track(store);

  if (!searchQuery) {
    return;
  }

  const queryRegex = searchQuery
    ? new RegExp(searchQuery.replace(/[-[\]{}()*+?.,\\^$|]/g, '\\$&'), 'i')
    : undefined;

  nsmApi2.editor.updateEditorSearchQuery(queryRegex);
});

export const searchEffects = [
  wsNameEffect,
  searchEffect,
  highlightEditorsEffect,
];
