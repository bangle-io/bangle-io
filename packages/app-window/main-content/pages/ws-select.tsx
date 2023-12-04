import { ActionGroup, Flex, Item, Text } from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import FolderAdd from '@spectrum-icons/workflow/FolderAdd';
import FolderDelete from '@spectrum-icons/workflow/FolderDelete';
import FolderOpen from '@spectrum-icons/workflow/FolderOpen';
import React from 'react';

import { sliceWorkspaces } from '@bangle.io/misc-slices';
import { slicePage } from '@bangle.io/slice-page';
import { APP_DIALOG_NAME, sliceUI } from '@bangle.io/slice-ui';
import { MainContentWrapper, WorkspaceTable } from '@bangle.io/ui';

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

export default function PageWorkspaceSelectionPage() {
  const store = useStore();

  const { widescreen } = useTrack(sliceUI);
  const [selectedWsKey, updateSelectedWsKey] = React.useState<
    string | undefined
  >(undefined);

  const { workspaces } = useTrack(sliceWorkspaces);

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
        store.dispatch(
          sliceUI.actions.showDialog(APP_DIALOG_NAME.workspaceCreate, {}),
        );
        break;
      case 'delete-workspace': {
        if (selectedWsKey) {
          store.dispatch(
            sliceUI.actions.showDialog(APP_DIALOG_NAME.workspaceConfirmDelete, {
              workspaceName: selectedWsKey,
            }),
          );
        }
        break;
      }
    }
  };

  return (
    <MainContentWrapper>
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
        createWorkspace={() => {
          store.dispatch(
            sliceUI.actions.showDialog(APP_DIALOG_NAME.workspaceCreate, {}),
          );
        }}
      />
    </MainContentWrapper>
  );
}
