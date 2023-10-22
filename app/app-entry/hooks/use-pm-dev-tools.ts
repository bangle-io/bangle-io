import { useEffect } from 'react';

import { useNsmPlainStore } from '@bangle.io/bangle-store-context';
import { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';
import { safeRequestIdleCallback } from '@bangle.io/utils';

export function usePMDevTools() {
  const nsmStore = useNsmPlainStore();

  useEffect(() => {
    // TODO: this setup should be done in app
    safeRequestIdleCallback(() => {
      if (
        typeof window !== 'undefined' &&
        window.location.hash.includes('debug_pm')
      ) {
        const primaryEditor = nsmEditorManagerSlice.get(
          nsmStore.state,
        ).primaryEditor;

        if (primaryEditor) {
          // console.log('debugging pm');
          // import(
          //   /* webpackChunkName: "prosemirror-dev-tools" */ 'prosemirror-dev-tools'
          // ).then((args) => {
          //   args.applyDevTools(primaryEditor!.view);
          // });
        }
      }
    });
  }, [nsmStore]);
}
