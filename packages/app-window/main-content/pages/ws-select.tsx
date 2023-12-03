import {
  ActionGroup,
  DialogContainer,
  DialogTrigger,
  Flex,
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

export default function PageWorkspaceSelectionPage() {
  const store = useStore();

  const { widescreen } = useTrack(sliceUI);

  const [selectedWsKey, updateSelectedWsKey] = React.useState<
    string | undefined
  >(undefined);

  const { eternalVars } = getWindowStoreConfig(store);

  const [refresh, updateRefresh] = React.useState(0);

  const [workspaces, updateWorkspaces] = React.useState<
    WorkspaceInfo[] | undefined
  >(undefined);

  React.useEffect(() => {
    let destroyed = false;
    const workspacesProm = eternalVars.appDatabase.getAllWorkspaces();

    void workspacesProm.then((workspaces) => {
      if (destroyed) {
        return;
      }
      updateWorkspaces(
        [...workspaces].sort((a, b) => b.lastModified - a.lastModified),
      );
    });
    return () => {
      destroyed = true;
    };
  }, [eternalVars, refresh]);

  const disabledKeys = selectedWsKey
    ? []
    : ['open-workspace', 'delete-workspace'];

  const [showCreateWsDialog, updateShowCreateWsDialog] = React.useState(false);

  return (
    <MainContentWrapper>
      <DialogContainer
        type={widescreen ? 'modal' : 'fullscreen'}
        onDismiss={() => {
          updateShowCreateWsDialog(false);
        }}
      >
        {showCreateWsDialog && (
          <CreateWorkspaceDialog
            onConfirm={(val) => {
              void eternalVars.appDatabase
                .createWorkspaceInfo({
                  metadata: {},
                  name: val.wsName,
                  type: WorkspaceType.Browser,
                })
                .then(() => {
                  updateRefresh((prev) => prev + 1);
                });
              updateShowCreateWsDialog(false);
            }}
          />
        )}
      </DialogContainer>
      {/* <Well role="region" aria-labelledby="Welcome" marginTop="size-300">
  <Text UNSAFE_className="text-2xl">Welcome Back!</Text>
  <div>
    <Text UNSAFE_className="text-sm">Learn more about Bangle.io</Text>
  </div>
</Well> */}
      <Flex direction="row" justifyContent="space-between" gap="size-100">
        <Text UNSAFE_className="text-2xl">Workspaces</Text>
        <ActionGroup
          alignSelf="center"
          items={[
            {
              key: 'open-workspace',
              icon: <FolderOpen />,
              label: 'Open',
            },
            {
              key: 'delete-workspace',
              icon: <FolderDelete />,
              label: 'Delete',
            },
            {
              key: 'new-workspace',
              icon: <FolderAdd />,
              label: 'New',
            },
          ].filter((item) => !disabledKeys.includes(item.key))}
          disabledKeys={disabledKeys}
          onAction={(key) => {
            if (key === 'open-workspace') {
              store.dispatch(
                slicePage.actions.goTo({
                  pathname: '/ws/' + selectedWsKey,
                }),
              );
            }
            if (key === 'new-workspace') {
              updateShowCreateWsDialog(true);
            }
          }}
        >
          {(item) => {
            return (
              <Item key={item.key}>
                {item.icon}
                <Text>{item.label}</Text>
              </Item>
            );
          }}
        </ActionGroup>
      </Flex>
      {workspaces && (
        <WorkspaceTable
          widescreen={widescreen}
          workspaces={workspaces}
          selectedKey={selectedWsKey}
          updateSelectedKey={updateSelectedWsKey}
          goToWorkspace={(wsName) => {
            store.dispatch(
              slicePage.actions.goTo({
                pathname: '/ws/' + wsName,
              }),
            );
          }}
          createWorkspace={() => {
            //
          }}
        />
      )}
    </MainContentWrapper>
  );
}
