import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  Divider,
  Heading,
  Text,
  useDialogContainer,
} from '@adobe/react-spectrum';
import { useStore } from '@nalanda/react';
import React from 'react';

import { WorkspaceType } from '@bangle.io/constants';
import { AppDialog } from '@bangle.io/dialog-maker';
import { getWindowStoreConfig } from '@bangle.io/lib-common';
import { APP_DIALOG_NAME } from '@bangle.io/slice-ui';
import { CreateWorkspaceDialog } from '@bangle.io/ui';

type DialogProps = Extract<
  AppDialog,
  { name: (typeof APP_DIALOG_NAME)['workspaceCreate'] }
>;

export function WorkspaceCreateDialog({ name }: DialogProps) {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { dismiss } = useDialogContainer();
  const store = useStore();
  const { eternalVars } = getWindowStoreConfig(store);

  return (
    <CreateWorkspaceDialog
      onConfirm={(val) => {
        void eternalVars.appDatabase
          .createWorkspaceInfo({
            metadata: {},
            name: val.wsName,
            type: WorkspaceType.Browser,
          })
          .then(() => {
            // updateRefresh((prev) => prev + 1);
          });
        dismiss();
      }}
    />
  );
}
