import React, { useCallback } from 'react';

import { nsmApi2 } from '@bangle.io/api';
import { GENERIC_ERROR_MODAL_NAME } from '@bangle.io/constants';
import type { GenericErrorModalMetadata } from '@bangle.io/shared-types';
import { Dialog, ExternalLink } from '@bangle.io/ui-components';

export function GenericErrorModal() {
  const { dialogMetadata } = nsmApi2.ui.uiState();

  const metadata = parseMetadata(dialogMetadata);

  const onDismiss = useCallback(() => {
    nsmApi2.ui.dismissDialog(GENERIC_ERROR_MODAL_NAME);
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
