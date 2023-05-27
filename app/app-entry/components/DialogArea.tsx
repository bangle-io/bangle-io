import React, { useCallback } from 'react';

import { useNsmSlice } from '@bangle.io/bangle-store-context';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';

export function DialogArea() {
  const [{ dialogName }, uiDispatch] = useNsmSlice(nsmUISlice);
  const extensionRegistry = useExtensionRegistryContext();
  const match = dialogName && extensionRegistry.getDialog(dialogName);

  const onDismiss = useCallback(
    (dialog: string) => {
      uiDispatch(nsmUI.dismissDialog(dialog));
    },
    [uiDispatch],
  );

  if (!match) {
    if (dialogName) {
      console.error('Unknown dialogName ', dialogName);
    }

    return null;
  }

  return React.createElement(match.ReactComponent, {
    onDismiss,
    dialogName,
  });
}
