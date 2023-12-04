import {
  ActionGroup,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Divider,
  Flex,
  Heading,
  Item,
  Text,
} from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import FolderAdd from '@spectrum-icons/workflow/FolderAdd';
import FolderDelete from '@spectrum-icons/workflow/FolderDelete';
import FolderOpen from '@spectrum-icons/workflow/FolderOpen';
import React from 'react';

import { WorkspaceType } from '@bangle.io/constants';
import { getWindowStoreConfig } from '@bangle.io/lib-common';
import { WorkspaceInfo } from '@bangle.io/shared-types';
import { slicePage } from '@bangle.io/slice-page';
import { sliceUI } from '@bangle.io/slice-ui';
import {
  CreateWorkspaceDialog,
  MainContentWrapper,
  WorkspaceTable,
} from '@bangle.io/ui';

interface WorkspaceActionsProps {
  disabledKeys: string[];
  onAction: (key: React.Key) => void;
}

function WorkspaceActions({ disabledKeys, onAction }: WorkspaceActionsProps) {
  return (
    <ActionGroup
      alignSelf="center"
      items={[
        { key: 'open-workspace', icon: <FolderOpen />, label: 'Open' },
        { key: 'delete-workspace', icon: <FolderDelete />, label: 'Delete' },
        { key: 'new-workspace', icon: <FolderAdd />, label: 'New' },
      ]}
      disabledKeys={disabledKeys}
      onAction={onAction}
    >
      {(item) => (
        <Item key={item.key}>
          {item.icon}
          <Text>{item.label}</Text>
        </Item>
      )}
    </ActionGroup>
  );
}

// CreateWorkspaceDialogComponent
interface CreateWorkspaceDialogProps {
  onConfirm: (wsName: string) => void;
  onCancel: () => void;
}

const CreateWorkspaceDialogComponent: React.FC<CreateWorkspaceDialogProps> = ({
  onConfirm,
  onCancel,
}) => (
  <CreateWorkspaceDialog
    onConfirm={(val) => {
      onConfirm(val.wsName);
      onCancel();
    }}
  />
);

// DeleteWorkspaceDialogComponent
interface DeleteWorkspaceDialogProps {
  selectedWsKey: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteWorkspaceDialogComponent({
  selectedWsKey,
  onConfirm,
  onCancel,
}: DeleteWorkspaceDialogProps) {
  return (
    <Dialog>
      <Heading>Are you sure?</Heading>
      <Divider />
      <Content>
        <Text>
          You are about to delete the workspace {'"'}
          <b>{selectedWsKey}</b>
          {'"'}. This action is irreversible.
        </Text>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={onCancel} autoFocus>
          Cancel
        </Button>
        <Button variant="negative" onPress={onConfirm}>
          Delete
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}

export default function PageWorkspaceSelectionPage() {
  const store = useStore();

  const { widescreen } = useTrack(sliceUI);
  const [selectedWsKey, updateSelectedWsKey] = React.useState<
    string | undefined
  >(undefined);
  const { eternalVars } = getWindowStoreConfig(store);
  const [refresh, updateRefresh] = React.useState(0);

  const [showCreateWsDialog, updateShowCreateWsDialog] = React.useState(false);
  const [showConfirmDeleteDialog, updateConfirmDeleteDialog] =
    React.useState(false);
  const [workspaces, updateWorkspaces] = React.useState<
    WorkspaceInfo[] | undefined
  >(undefined);

  React.useEffect(() => {
    const workspacesProm = eternalVars.appDatabase.getAllWorkspaces();
    let destroyed = true;

    void workspacesProm.then((workspaces) => {
      if (destroyed) {
        updateWorkspaces(
          [...workspaces].sort((a, b) => b.lastModified - a.lastModified),
        );
      }
    });

    return () => {
      destroyed = false;
    };
  }, [eternalVars, refresh]);

  React.useEffect(() => {
    if (!workspaces) {
      return;
    }
    if (selectedWsKey && !workspaces.find((ws) => ws.name === selectedWsKey)) {
      updateSelectedWsKey(workspaces[0]?.name);
    }
  }, [workspaces, selectedWsKey]);

  const disabledKeys = selectedWsKey
    ? []
    : ['open-workspace', 'delete-workspace'];

  const handleAction = (key: React.Key) => {
    switch (key) {
      case 'open-workspace':
        store.dispatch(
          slicePage.actions.goTo({ pathname: '/ws/' + selectedWsKey }),
        );
        break;
      case 'new-workspace':
        updateShowCreateWsDialog(true);
        break;
      case 'delete-workspace':
        updateConfirmDeleteDialog(true);
        break;
    }
  };

  const handleConfirmCreate = (wsName: string) => {
    void eternalVars.appDatabase
      .createWorkspaceInfo({
        metadata: {},
        name: wsName,
        type: WorkspaceType.Browser,
      })
      .then(() => {
        updateRefresh((prev) => prev + 1);
      });
  };

  const handleConfirmDelete = () => {
    if (selectedWsKey) {
      void eternalVars.appDatabase
        .deleteWorkspaceInfo(selectedWsKey)
        .then(() => {
          updateRefresh((prev) => prev + 1);
        });
    }
    updateConfirmDeleteDialog(false);
  };

  const handleCancel = () => {
    updateShowCreateWsDialog(false);
    updateConfirmDeleteDialog(false);
  };

  return (
    <MainContentWrapper>
      <DialogContainer
        type={widescreen ? 'modal' : 'fullscreen'}
        onDismiss={handleCancel}
      >
        {showCreateWsDialog && (
          <CreateWorkspaceDialogComponent
            onConfirm={handleConfirmCreate}
            onCancel={handleCancel}
          />
        )}
        {showConfirmDeleteDialog && selectedWsKey && (
          <DeleteWorkspaceDialogComponent
            selectedWsKey={selectedWsKey}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancel}
          />
        )}
      </DialogContainer>
      <Flex direction="row" justifyContent="space-between" gap="size-100">
        <Text UNSAFE_className="text-2xl">Workspaces</Text>
        <WorkspaceActions disabledKeys={disabledKeys} onAction={handleAction} />
      </Flex>
      <WorkspaceTable
        widescreen={widescreen}
        workspaces={workspaces}
        selectedKey={selectedWsKey}
        updateSelectedKey={updateSelectedWsKey}
        goToWorkspace={(wsName) => {
          store.dispatch(slicePage.actions.goTo({ pathname: '/ws/' + wsName }));
        }}
        createWorkspace={() => updateShowCreateWsDialog(true)}
      />
    </MainContentWrapper>
  );
}
