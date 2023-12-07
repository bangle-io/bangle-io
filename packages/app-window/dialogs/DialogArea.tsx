import { DialogContainer } from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import React, { useMemo } from 'react';

import {
  APP_DIALOG_NAME,
  AppDialog,
  AppDialogName,
} from '@bangle.io/dialog-maker';
import { sliceUI } from '@bangle.io/slice-ui';

import { FileConfirmDeleteDialog } from './dialogs/FileConfirmDeleteDialog';
import { WorkspaceConfirmDeleteDialogComponent } from './dialogs/WorkspaceConfirmDeleteDialog';
import { WorkspaceCreateBrowserDialog } from './dialogs/WorkspaceCreateBrowserDialog';
import { WorkspaceCreateNativeFSDialog } from './dialogs/WorkspaceCreateNativeFSDialog';
import { WorkspaceCreateSelectTypeDialog } from './dialogs/WorkspaceCreateSelectTypeDialog';
import { logger } from './logger';
import { registerDialogComponent } from './register-dialogs';

const dialogRegistry: Record<string, (props: AppDialog) => React.ReactNode> =
  {};

registerDialogComponent(
  dialogRegistry,
  APP_DIALOG_NAME.workspaceConfirmDelete,
  WorkspaceConfirmDeleteDialogComponent,
);

registerDialogComponent(
  dialogRegistry,
  APP_DIALOG_NAME.workspaceCreateBrowser,
  WorkspaceCreateBrowserDialog,
);

registerDialogComponent(
  dialogRegistry,
  APP_DIALOG_NAME.workspaceCreateSelectTypeDialog,
  WorkspaceCreateSelectTypeDialog,
);

registerDialogComponent(
  dialogRegistry,
  APP_DIALOG_NAME.workspaceCreateNativeFS,
  WorkspaceCreateNativeFSDialog,
);

registerDialogComponent(
  dialogRegistry,
  APP_DIALOG_NAME.fileConfirmDelete,
  FileConfirmDeleteDialog,
);

export function DialogArea() {
  const { widescreen, dialog } = useTrack(sliceUI);
  const store = useStore();

  let children = useMemo(() => {
    if (!dialog) {
      return null;
    }

    const DialogComponent = dialogRegistry[dialog.name];

    if (!DialogComponent) {
      logger.warn('Dialog not found', dialog.name);
      return null;
    }

    return <DialogComponent {...dialog} />;
  }, [dialog]);

  const handleCancel = (name?: AppDialogName) => {
    store.dispatch(sliceUI.actions.clearDialog(name));
  };

  return (
    <DialogContainer
      type={widescreen ? 'modal' : 'fullscreen'}
      onDismiss={handleCancel}
    >
      {children}
    </DialogContainer>
  );
}
