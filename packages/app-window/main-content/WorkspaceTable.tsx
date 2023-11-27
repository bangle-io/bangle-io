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
import NotFound from '@spectrum-icons/illustrations/NotFound';
import React from 'react';

import { WorkspaceInfo } from '@bangle.io/shared-types';

export function WorkspaceTable({
  widescreen,
  workspaces,
}: {
  widescreen: boolean;
  workspaces: WorkspaceInfo[];
}) {
  return (
    <TableView
      isQuiet
      aria-label="Recetly opened workspaces"
      selectionMode="single"
      selectionStyle="highlight"
      onAction={(selection) => {
        console.log(selection);
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
            <Row key={workspace.name + workspace.type}>
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
