import { ActionGroup, Flex, Item, Text, Well } from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import FolderAdd from '@spectrum-icons/workflow/FolderAdd';
import FolderDelete from '@spectrum-icons/workflow/FolderDelete';
import FolderOpen from '@spectrum-icons/workflow/FolderOpen';
import React from 'react';
import { Redirect, Route, Switch } from 'wouter';

import { getWindowStoreConfig } from '@bangle.io/lib-common';
import { WorkspaceInfo } from '@bangle.io/shared-types';
import { slicePage } from '@bangle.io/slice-page';
import { sliceUI } from '@bangle.io/slice-ui';

import { WorkspaceTable } from '../components/WorkspaceTable';

export default function PageWsHomePage() {
  const store = useStore();

  const { widescreen } = useTrack(sliceUI);

  const [selectedWsKey, updateSelectedWsKey] = React.useState<
    string | undefined
  >(undefined);

  const { eternalVars } = getWindowStoreConfig(store);

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
  }, [eternalVars]);

  const disabledKeys = selectedWsKey
    ? []
    : ['open-workspace', 'delete-workspace'];

  return (
    <Flex
      direction="column"
      height="100%"
      gap="size-200"
      UNSAFE_className="overflow-y-scroll B-app-main-content px-2 widescreen:px-4 py-4"
    >
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
        />
      )}
    </Flex>
  );
}
