import { useCallback } from 'react';

import { useLocalStorage } from '@bangle.io/utils';

const MAX_ENTRIES = 10;
/**
 * WARNING this will modify items in place
 * @param {*} uniqueStoreId
 * @param {*} items
 * @returns
 */
export function useRecencyWatcher(
  uniqueStoreId: string,
  { maxEntries = MAX_ENTRIES } = {},
) {
  const [operationHistory, updateOperationHistory] = useLocalStorage<{
    [r: string]: number;
  }>(uniqueStoreId, {});

  const updateRecency = useCallback(
    (uid: string) => {
      updateOperationHistory((obj: { [r: string]: number }) => {
        const entries = Object.entries(obj || {}).sort((a, b) => {
          if (typeof a[1] === 'number' && typeof b[1] === 'number') {
            return b[1] - a[1];
          }

          return 0;
        });
        // trim the object to contain its size
        const newObj = Object.fromEntries(entries.slice(0, maxEntries));
        newObj[uid] = Date.now();

        return newObj;
      });
    },
    [updateOperationHistory, maxEntries],
  );

  const injectRecency = useCallback(
    <
      R extends {
        uid: string;
        title: string;
        rightNode?: any;
        showDividerAbove?: boolean;
      },
      T extends R[],
    >(
      items: T,
    ) => {
      const newItems = items.sort((a, b) => {
        const aRank = operationHistory[a.uid];
        const bRank = operationHistory[b.uid];

        if (aRank && bRank) {
          return bRank - aRank;
        }

        if (aRank && !bRank) {
          return -1;
        }

        if (bRank && !aRank) {
          return 1;
        }

        // fallback to title comparison
        return a.title.localeCompare(b.title);
      });

      // check if top one is recently used, if it is
      // add some juicy UI hints
      if (newItems[0] && operationHistory[newItems[0].uid]) {
        newItems[0].rightNode = 'Recent';
        const firstNotRecent = newItems.find(
          (a) => operationHistory[a.uid] == null,
        );

        if (firstNotRecent) {
          firstNotRecent.showDividerAbove = true;
        }
      }

      return newItems;
    },
    [operationHistory],
  );

  return {
    updateRecency,
    injectRecency,
  };
}
