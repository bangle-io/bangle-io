import {
  Button,
  Cell,
  Column,
  Content,
  Flex,
  Heading,
  IllustratedMessage,
  Row,
  SearchField,
  TableBody,
  TableHeader,
  TableView,
} from '@adobe/react-spectrum';
import { SortDescriptor, SortDirection } from '@react-types/shared';
import NotFound from '@spectrum-icons/illustrations/NotFound';
import React, { useState } from 'react';

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
  const [searchInput, setSearchInput] = useState<string>('');

  const sortedWsPathsInfo = React.useMemo(() => {
    if (!wsPathsInfo) {
      return undefined;
    }

    const filteredWsPathsInfo = wsPathsInfo.filter((wsPathInfo) =>
      wsPathInfo.wsPath.toLowerCase().includes(searchInput.toLowerCase()),
    );

    return filteredWsPathsInfo.sort((a, b) => {
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
  }, [wsPathsInfo, sortDescriptor, searchInput]);

  if (!sortedWsPathsInfo) {
    return null;
  }

  return (
    <Flex direction="column" gap="size-100">
      <Flex direction="row" justifyContent="space-between" gap="size-100">
        <SearchField
          label=""
          labelPosition="side"
          defaultValue=""
          width="size-3600"
          onChange={(value) => setSearchInput(value)}
        />
      </Flex>
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
          <Column key={COLUMN_PATH} allowsSorting>
            Path
          </Column>
          <Column align="end">Last Modified</Column>
        </TableHeader>
        <TableBody items={sortedWsPathsInfo}>
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
    </Flex>
  );
}