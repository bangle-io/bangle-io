import React from 'react';

import type { DialogComponentType } from '@bangle.io/shared-types';
import { Dialog } from '@bangle.io/ui-components';

export const NewBrowserWorkspaceDialog: DialogComponentType = (props) => {
  return (
    <Dialog
      headingTitle="New Browser Workspace"
      isDismissable
      onDismiss={() => props.onDismiss(props.dialogName)}
      size="medium"
    >
      hi
    </Dialog>
  );
};
