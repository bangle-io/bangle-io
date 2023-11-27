import {
  Button,
  Cell,
  Column,
  Content,
  Heading,
  IllustratedMessage,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from '@adobe/react-spectrum';
import { useStore } from '@nalanda/react';
import NotFound from '@spectrum-icons/illustrations/NotFound';
import React from 'react';

import { WorkspaceInfo } from '@bangle.io/shared-types';
import { slicePage } from '@bangle.io/slice-page';

export function WorkspaceTable({
  widescreen,
  workspaces,
  selectedKey,
  updateSelectedKey,
}: {
  widescreen: boolean;
  workspaces: WorkspaceInfo[];
  selectedKey: string | undefined;
  updateSelectedKey: (key: string) => void;
}) {
  const store = useStore();

  return (
    <TableView
      isQuiet
      aria-label="Recetly opened workspaces"
      selectionMode="single"
      selectionStyle="highlight"
      selectedKeys={selectedKey ? [selectedKey] : []}
      onSelectionChange={(selection) => {
        if (selection !== 'all' && selection.size === 1) {
          updateSelectedKey(selection.values().next().value);
        }
      }}
      onAction={(selection) => {
        store.dispatch(
          slicePage.actions.goTo({
            pathname: '/ws/' + selection.toString(),
          }),
        );
      }}
      maxHeight={widescreen ? '50vh' : undefined}
      minHeight="size-4600"
      renderEmptyState={() => {
        return (
          <IllustratedMessage>
            <NotFound />
            <Heading>No workspaces found</Heading>
            <Content>
              <Button variant="secondary" style="fill">
                Create a workspace
              </Button>
            </Content>
          </IllustratedMessage>
        );
      }}
    >
      <TableHeader>
        <Column>Name</Column>
        <Column>Type</Column>
        <Column align="end">Last Modified</Column>
      </TableHeader>
      <TableBody items={workspaces}>
        {(workspace) => {
          return (
            <Row key={workspace.name}>
              <Cell>{workspace.name}</Cell>
              <Cell>{workspace.type}</Cell>
              <Cell>
                {new Date(workspace.lastModified).toLocaleDateString()}
              </Cell>
            </Row>
          );
        }}
      </TableBody>
    </TableView>
  );
}
