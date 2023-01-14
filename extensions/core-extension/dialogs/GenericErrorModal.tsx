import React, { useCallback } from 'react';

import { GENERIC_ERROR_MODAL_NAME } from '@bangle.io/constants';
import type { GenericErrorModalMetadata } from '@bangle.io/shared-types';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import { Dialog, ExternalLink } from '@bangle.io/ui-components';

export function GenericErrorModal() {
  const { dispatch, dialogMetadata } = useUIManagerContext();

  const metadata = parseMetadata(dialogMetadata);

  const onDismiss = useCallback(() => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:DISMISS_DIALOG',
      value: {
        dialogName: GENERIC_ERROR_MODAL_NAME,
      },
    });
  }, [dispatch]);

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
      headingTitle={metadata.title}
      footer={
        <ExternalLink
          text="Report an issue"
          href="https://github.com/bangle-io/bangle-io/issues/new"
        />
      }
    >
      {metadata.description}
    </Dialog>
  );
}

function parseMetadata(dialogMetadata: any): GenericErrorModalMetadata {
  if (
    dialogMetadata &&
    typeof dialogMetadata.title === 'string' &&
    typeof dialogMetadata.description === 'string'
  ) {
    const { title, description } = dialogMetadata;

    return { title, description };
  }
  console.warn('Unable to parse dialog metadata', dialogMetadata);

  return { title: 'Error', description: 'Something went wrong' };
}
