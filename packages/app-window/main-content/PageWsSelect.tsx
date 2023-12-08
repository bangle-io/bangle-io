import { ActionGroup, Flex, Item, Text } from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import FolderAdd from '@spectrum-icons/workflow/FolderAdd';
import FolderDelete from '@spectrum-icons/workflow/FolderDelete';
import FolderOpen from '@spectrum-icons/workflow/FolderOpen';
import React from 'react';

import { APP_ERROR_NAME, throwAppError } from '@bangle.io/app-errors';
import { requestNativeBrowserFSPermission } from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import { sliceWorkspaces } from '@bangle.io/misc-slices';
import { WorkspaceInfo } from '@bangle.io/shared-types';
import { slicePage } from '@bangle.io/slice-page';
import { APP_DIALOG_NAME, sliceUI } from '@bangle.io/slice-ui';
import { MainContentWrapper, WorkspaceTable } from '@bangle.io/ui';
import { locationHelpers } from '@bangle.io/ws-path';

interface WorkspaceActionsProps {
  disabledKeys: string[];
  onAction: (key: React.Key) => void;
}

enum ACTION_KEY {
  newWorkspace = 'new-workspace',
  deleteWorkspace = 'delete-workspace',
  openWorkspace = 'open-workspace',
}

function WorkspaceActions({ disabledKeys, onAction }: WorkspaceActionsProps) {
  return (
    <ActionGroup
      alignSelf="center"
      items={[
        { key: ACTION_KEY.openWorkspace, icon: <FolderOpen />, label: 'Open' },
        {
          key: ACTION_KEY.deleteWorkspace,
          icon: <FolderDelete />,
          label: 'Delete',
        },
        { key: ACTION_KEY.newWorkspace, icon: <FolderAdd />, label: 'New' },
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

export function PageWorkspaceSelect() {
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
    : [ACTION_KEY.openWorkspace, ACTION_KEY.deleteWorkspace];

  const goToWorkspace = (wsInfo: WorkspaceInfo) => {
    const goTo = () => {
      store.dispatch(
        slicePage.actions.goTo((location) =>
          locationHelpers.goToWorkspaceHome(location, wsInfo.name),
        ),
      );
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (wsInfo.type !== WorkspaceType.NativeFS) {
      goTo();
      return;
    }

    const rootDirHandle = wsInfo.metadata.rootDirHandle;
    if (!rootDirHandle) {
      throwAppError(
        APP_ERROR_NAME.workspaceCorrupted,
        'Workspace has no rootDirHandle',
        {
          wsName: wsInfo.name,
        },
      );
    }

    void requestNativeBrowserFSPermission(rootDirHandle).then((granted) => {
      if (granted) {
        goTo();
      } else {
        // TODO: show error
      }
    });
  };
  const handleAction = (key: React.Key) => {
    switch (key) {
      case ACTION_KEY.openWorkspace: {
        const match = workspaces?.find((ws) => ws.name === selectedWsKey);
        if (!match) {
          return;
        }
        goToWorkspace(match);
        break;
      }
      case ACTION_KEY.newWorkspace:
        store.dispatch(
          sliceUI.actions.showDialog(
            APP_DIALOG_NAME.workspaceCreateSelectTypeDialog,
            {},
          ),
        );
        break;
      case ACTION_KEY.deleteWorkspace: {
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
        goToWorkspace={goToWorkspace}
        createWorkspace={() => {
          store.dispatch(
            sliceUI.actions.showDialog(
              APP_DIALOG_NAME.workspaceCreateSelectTypeDialog,
              {},
            ),
          );
        }}
      />
    </MainContentWrapper>
  );
}
