import React, { useCallback } from 'react';
import { useLocalStorage } from 'utils';
/**
 * WARNING this will modify items in place
 * @param {*} uniqueStoreId
 * @param {*} items
 * @returns
 */
export function useRecencyWatcher(uniqueStoreId) {
  const [actionHistory, updateActionHistory] = useLocalStorage(
    uniqueStoreId,
    {},
  );

  const updateRecency = useCallback(
    (uid) => {
      updateActionHistory((obj) => {
        const entries = Object.entries(obj || {}).sort((a, b) => {
          if (typeof a[1] === 'number' && typeof b[1] === 'number') {
            return b[1] - a[1];
          }
          return 0;
        });
        // trim the object to contain its size to 5
        const newObj = Object.fromEntries(entries.slice(0, 5));
        newObj[uid] = Date.now();
        return newObj;
      });
    },
    [updateActionHistory],
  );

  const injectRecency = useCallback(
    (items) => {
      const newItems = items.sort((a, b) => {
        const aRank = actionHistory[a.uid];
        const bRank = actionHistory[b.uid];
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
      if (newItems[0] && actionHistory[newItems[0].uid]) {
        newItems[0].rightNode = 'Recent';
        const firstNotRecent = newItems.find(
          (a) => actionHistory[a.uid] == null,
        );
        if (firstNotRecent) {
          firstNotRecent.showDividerAbove = true;
        }
      }

      return newItems;
    },
    [actionHistory],
  );

  return {
    updateRecency,
    injectRecency,
  };
}
