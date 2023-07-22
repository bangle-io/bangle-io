import React, { useCallback } from 'react';

import { nsmApi2 } from '@bangle.io/api';
import { RELOAD_APPLICATION_DIALOG_NAME } from '@bangle.io/constants';
import { Dialog } from '@bangle.io/ui-components';

export function ReloadApplicationDialog() {
  const onDismiss = useCallback(() => {
    nsmApi2.ui.dismissDialog(RELOAD_APPLICATION_DIALOG_NAME);
  }, []);

  return (
    <Dialog
      onDismiss={onDismiss}
      primaryButtonConfig={{
        text: 'Reload',
        onPress: () => {
          window.location.reload();
        },
      }}
      size="md"
      isDismissable={true}
      headingTitle="Reload Application"
    >
      Are you sure you want to reload the application?
    </Dialog>
  );
}
