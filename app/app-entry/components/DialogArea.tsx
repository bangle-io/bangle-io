import React, { useCallback } from 'react';

import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { dismissDialog, useUIManagerContext } from '@bangle.io/slice-ui';

export function DialogArea() {
  const { dialogName, bangleStore } = useUIManagerContext();
  const extensionRegistry = useExtensionRegistryContext();
  const match = dialogName && extensionRegistry.getDialog(dialogName);

  const onDismiss = useCallback(
    (dialog: string) => {
      dismissDialog(dialog)(bangleStore.state, bangleStore.dispatch);
    },
    [bangleStore],
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
