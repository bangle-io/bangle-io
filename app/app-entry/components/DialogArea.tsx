import React from 'react';

import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { useUIManagerContext } from '@bangle.io/slice-ui';

export function DialogArea() {
  const { dialogName } = useUIManagerContext();
  const extensionRegistry = useExtensionRegistryContext();
  const match = dialogName && extensionRegistry.getDialog(dialogName);

  if (!match) {
    if (dialogName) {
      console.error('Unknown dialogName ', dialogName);
    }

    return null;
  }

  return React.createElement(match.ReactComponent, {});
}
