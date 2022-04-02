import React, { useCallback } from 'react';

import { RELOAD_APPLICATION_DIALOG_NAME } from '@bangle.io/constants';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import { AlertModal } from '@bangle.io/ui-components';

export function ReloadApplicationDialog() {
  const { dispatch } = useUIManagerContext();

  const onDismiss = useCallback(() => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:DISMISS_DIALOG',
      value: {
        dialogName: RELOAD_APPLICATION_DIALOG_NAME,
      },
    });
  }, [dispatch]);

  return (
    <AlertModal
      onClose={onDismiss}
      primaryButtonConfig={{
        text: 'Reload',
        onPress: () => {
          window.location.reload();
        },
      }}
      size="medium"
      isDismissable={true}
      headingTitle="Reload Application"
    >
      Are you sure you want to reload the application?
    </AlertModal>
  );
}
