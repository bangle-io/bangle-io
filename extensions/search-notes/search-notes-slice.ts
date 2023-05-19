import { changeEffect, createSliceV2, nsmApi2, NsmSlice } from '@bangle.io/api';
import { isAbortError } from '@bangle.io/utils';

import type { SearchNotesExtensionState } from './constants';
import { searchNotes } from './search-notes';

const initState: SearchNotesExtensionState = {
  searchQuery: '',
  externalInputChange: 0,
  pendingSearch: false,
  searchResults: null,
};

export const SLICE_NAME = 'slice::search-notes:main';

export const searchSlice = createSliceV2([], {
  name: SLICE_NAME,
  initState,
});

export const updateSearchQuery = searchSlice.createAction(
  'updateSearchQuery',
  (data: { query: string }) => {
    return (state) => {
      return {
        ...state,
        searchQuery: data.query,
      };
    };
  },
);

export const updateExternalSearchQuery = searchSlice.createAction(
  'updateExternalSearchQuery',
  (query: string) => {
    return (state): SearchNotesExtensionState => {
      return {
        ...state,
        searchQuery: query,
        externalInputChange: state.externalInputChange + 1,
      };
    };
  },
);

export const updateSliceState = searchSlice.createAction(
  'updateSliceState',
  (data: Omit<Partial<SearchNotesExtensionState>, 'searchQuery'>) => {
    return (state): SearchNotesExtensionState => {
      return {
        ...state,
        ...data,
      };
    };
  },
);

NsmSlice.registerEffectSlice(searchSlice, [
  changeEffect(
    'wsNameEffect',
    {
      wsName: nsmApi2.workspace.pick((s) => s.wsName),
      // need passive pick to get correct dispatch typing
      searchResults: searchSlice.passivePick((s) => s.searchResults),
    },
    ({ wsName }, dispatch) => {
      dispatch(
        updateSliceState({
          searchResults: null,
          pendingSearch: false,
        }),
      );
    },
  ),

  changeEffect(
    'searchEffect',
    {
      searchQuery: searchSlice.pick((s) => s.searchQuery),
      wsName: nsmApi2.workspace.pick((s) => s.wsName),
    },
    (
      { wsName, searchQuery },
      dispatch,
      ref: {
        controller?: AbortController;
      },
    ) => {
      ref.controller?.abort();

      if (!wsName) {
        return;
      }

      if (searchQuery === '') {
        dispatch(
          updateSliceState({ searchResults: null, pendingSearch: false }),
        );

        return;
      }

      dispatch(updateSliceState({ searchResults: null, pendingSearch: true }));

      let controller = new AbortController();
      ref.controller = controller;

      searchNotes(controller.signal, searchQuery, wsName)
        .then((result) => {
          if (!controller.signal.aborted) {
            dispatch(
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
          dispatch(updateSliceState({ pendingSearch: false }));

          throw error;
        });
    },
  ),

  changeEffect(
    'highlightEditorsEffect',
    {
      searchQuery: searchSlice.pick((s) => s.searchQuery),
    },
    ({ searchQuery }) => {
      if (!searchQuery) {
        return;
      }
      const queryRegex = searchQuery
        ? new RegExp(searchQuery.replace(/[-[\]{}()*+?.,\\^$|]/g, '\\$&'), 'i')
        : undefined;

      nsmApi2.editor.updateEditorSearchQuery(queryRegex);
    },
  ),
]);
