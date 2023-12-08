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
import { SortDescriptor } from '@react-types/shared';
import NotFound from '@spectrum-icons/illustrations/NotFound';
import React from 'react';

import { WorkspaceInfo } from '@bangle.io/shared-types';

const COLUMN_NAME = 'name';
const COLUMN_TYPE = 'type';
const COLUMN_LAST_MODIFIED = 'lastModified';

export function WorkspaceTable({
  widescreen,
  workspaces,
  selectedKey,
  updateSelectedKey,
  goToWorkspace,
  createWorkspace,
}: {
  widescreen: boolean;
  workspaces?: WorkspaceInfo[];
  selectedKey: string | undefined;
  updateSelectedKey: (key: string) => void;
  goToWorkspace: (wsInfo: WorkspaceInfo) => void;
  createWorkspace: () => void;
}) {
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: COLUMN_LAST_MODIFIED,
    direction: 'descending',
  });

  const sortedWorkspaces = React.useMemo(() => {
    if (!workspaces) {
      return [];
    }
    return workspaces.sort((a, b) => {
      let compareValue = 0;
      if (sortDescriptor.column === COLUMN_NAME) {
        compareValue = a.name.localeCompare(b.name);
      } else if (sortDescriptor.column === COLUMN_TYPE) {
        compareValue = a.type.localeCompare(b.type);
      } else if (sortDescriptor.column === COLUMN_LAST_MODIFIED) {
        compareValue = a.lastModified - b.lastModified;
      }

      return sortDescriptor.direction === 'ascending'
        ? compareValue
        : -compareValue;
    });
  }, [workspaces, sortDescriptor]);

  if (!workspaces) {
    return null;
  }

  return (
    <TableView
      isQuiet
      aria-label="Recently opened workspaces"
      selectionMode="single"
      selectionStyle="highlight"
      sortDescriptor={sortDescriptor}
      onSortChange={setSortDescriptor}
      selectedKeys={selectedKey ? [selectedKey] : []}
      onSelectionChange={(selection) => {
        if (selection !== 'all' && selection.size === 1) {
          updateSelectedKey(selection.values().next().value);
        }
      }}
      onAction={(selection) => {
        const wsInfo = sortedWorkspaces.find(
          (wsInfo) => wsInfo.name === selection.toString(),
        );
        if (!wsInfo) {
          return;
        }
        goToWorkspace(wsInfo);
      }}
      maxHeight={widescreen ? '50vh' : undefined}
      minHeight="size-4600"
      renderEmptyState={() => {
        return (
          <IllustratedMessage>
            <NotFound />
            <Heading>No workspaces found</Heading>
            <Content>
              <Button
                variant="secondary"
                style="fill"
                onPress={createWorkspace}
              >
                Create a workspace
              </Button>
            </Content>
          </IllustratedMessage>
        );
      }}
    >
      <TableHeader>
        <Column key={COLUMN_NAME} allowsSorting>
          Name
        </Column>
        <Column key={COLUMN_TYPE} allowsSorting>
          Type
        </Column>
        <Column key={COLUMN_LAST_MODIFIED} align="end" allowsSorting>
          Last Modified
        </Column>
      </TableHeader>
      <TableBody items={sortedWorkspaces}>
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
