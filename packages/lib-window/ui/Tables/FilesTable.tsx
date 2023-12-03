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
import { SortDescriptor, SortDirection } from '@react-types/shared';
import NotFound from '@spectrum-icons/illustrations/NotFound';
import React from 'react';

import { resolvePath } from '@bangle.io/ws-path';

const COLUMN_NAME = 'name';
const COLUMN_PATH = 'path';
const COLUMN_LAST_MODIFIED = 'lastModified';

export function FilesTable({
  wsName,
  widescreen,
  wsPathsInfo,
  selectedKey,
  updateSelectedKey,
  goToWsPath,
  createNote,
}: {
  wsName: string;
  widescreen: boolean;
  wsPathsInfo?: ReturnType<typeof resolvePath>[];
  selectedKey: string | undefined;
  updateSelectedKey: (key: string) => void;
  goToWsPath: (wsPath: string) => void;
  createNote: () => void;
}) {
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: COLUMN_NAME,
    direction: 'ascending',
  });

  const sortedWsPathsInfo = React.useMemo(() => {
    if (!wsPathsInfo) {
      return undefined;
    }
    return wsPathsInfo.sort((a, b) => {
      if (sortDescriptor.column === COLUMN_NAME) {
        if (sortDescriptor.direction === 'ascending') {
          return a.fileNameWithoutExt.localeCompare(b.fileNameWithoutExt);
        }
        return b.fileNameWithoutExt.localeCompare(a.fileNameWithoutExt);
      }
      if (sortDescriptor.column === COLUMN_PATH) {
        if (sortDescriptor.direction === 'ascending') {
          return a.dirPath.localeCompare(b.dirPath);
        }
        return b.dirPath.localeCompare(a.dirPath);
      }

      return 0;
    });
  }, [wsPathsInfo, sortDescriptor]);

  return (
    <TableView
      isQuiet
      aria-label="Files"
      selectionMode="single"
      selectionStyle="highlight"
      sortDescriptor={sortDescriptor}
      onSortChange={(sortDescriptor: SortDescriptor) => {
        setSortDescriptor(sortDescriptor);
      }}
      selectedKeys={selectedKey ? [selectedKey] : []}
      onSelectionChange={(selection) => {
        if (selection !== 'all' && selection.size === 1) {
          updateSelectedKey(selection.values().next().value);
        }
      }}
      onAction={(selection) => {
        goToWsPath(selection.toString());
      }}
      maxHeight={widescreen ? '50vh' : undefined}
      minHeight="size-4600"
      renderEmptyState={() => {
        if (!wsPathsInfo) {
          return <></>;
        }
        return (
          <IllustratedMessage>
            <NotFound />
            <Heading>No Notes Found</Heading>
            <Content>
              <Button variant="secondary" style="fill" onPress={createNote}>
                Create a new note
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
        <Column key={COLUMN_PATH} width={'20%'} allowsSorting>
          Path
        </Column>
        <Column width={'20%'} align="end">
          Last Modified
        </Column>
      </TableHeader>
      <TableBody items={sortedWsPathsInfo ?? []}>
        {(wsPathInfo) => {
          return (
            <Row key={wsPathInfo.wsPath}>
              <Cell>{wsPathInfo.fileNameWithoutExt}</Cell>
              <Cell>{wsPathInfo.dirPath}</Cell>
              <Cell> </Cell>
            </Row>
          );
        }}
      </TableBody>
    </TableView>
  );
}
