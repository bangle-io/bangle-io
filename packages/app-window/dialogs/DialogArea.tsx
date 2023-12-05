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
import { WorkspaceCreateDialog } from './dialogs/WorkspaceCreateDialog';
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
  APP_DIALOG_NAME.workspaceCreate,
  WorkspaceCreateDialog,
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
