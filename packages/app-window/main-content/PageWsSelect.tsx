import { ActionGroup, Flex, Item, Text } from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import FolderAdd from '@spectrum-icons/workflow/FolderAdd';
import FolderOpen from '@spectrum-icons/workflow/FolderOpen';
import React, { useCallback, useMemo } from 'react';

import { APP_ERROR_NAME, throwAppError } from '@bangle.io/app-errors';
import { requestNativeBrowserFSPermission } from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import { sliceWorkspaces } from '@bangle.io/misc-slices';
import { WorkspaceInfo } from '@bangle.io/shared-types';
import { slicePage } from '@bangle.io/slice-page';
import { APP_DIALOG_NAME, sliceUI } from '@bangle.io/slice-ui';
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconLink,
  IconMoreVertical,
  Input,
  MainContentWrapper,
  WorkspaceTable,
} from '@bangle.io/ui';
import { locationHelpers } from '@bangle.io/ws-path';

export function PageWorkspaceSelect() {
  const store = useStore();
  const { workspaces } = useTrack(sliceWorkspaces);
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value.toLowerCase());
    },
    [],
  );

  const filteredWorkspaces = useMemo(() => {
    return workspaces
      ?.filter((ws) => {
        if (!searchTerm) {
          return true;
        }
        return (
          ws.name.toLowerCase().includes(searchTerm) ||
          ws.type.toLowerCase().includes(searchTerm)
        );
      })
      .sort((a, b) => {
        return b.lastModified - a.lastModified;
      });
  }, [workspaces, searchTerm]);

  return (
    <MainContentWrapper>
      <div className="flex flex-row gap-8 items-center">
        <Input
          aria-label="Search"
          placeholder="Search"
          onChange={handleSearchChange}
        />
        <Button
          onClick={() =>
            store.dispatch(
              sliceUI.actions.showDialog(
                APP_DIALOG_NAME.workspaceCreateSelectTypeDialog,
                {},
              ),
            )
          }
        >
          New Workspace
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {filteredWorkspaces?.map((wsInfo) => (
          <WorkspaceCard key={wsInfo.name} wsInfo={wsInfo} />
        ))}
      </div>
    </MainContentWrapper>
  );
}

function WorkspaceCard({ wsInfo }: { wsInfo: WorkspaceInfo }) {
  const store = useStore();

  const goToWorkspace = useCallback(
    (options: { metaKey: boolean }) => {
      const goTo = () => {
        const dest = locationHelpers.goToWorkspaceHome(location, wsInfo.name);

        if (options.metaKey) {
          window.open(dest.pathname);
          return;
        }

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
    },
    [wsInfo, store],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row w-full">
          <Button
            size="sm"
            variant="link"
            className="px-0 text-ellipsis text-nowrap"
            onClick={(e) => goToWorkspace({ metaKey: e.metaKey })}
          >
            <CardTitle>{truncateString(wsInfo.name, 22)}</CardTitle>
            <IconLink className="pl-1 h-5 w-5" />
          </Button>
          <div className="flex-grow"></div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Workspace Options"
              >
                <IconMoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={() =>
                    store.dispatch(
                      sliceUI.actions.showDialog(
                        APP_DIALOG_NAME.workspaceConfirmDelete,
                        { workspaceName: wsInfo.name },
                      ),
                    )
                  }
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>
          {prettyPrintRelativeDate(wsInfo.lastModified)} ({wsInfo.type})
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function prettyPrintRelativeDate(ms: number) {
  const now = new Date();
  const date = new Date(ms);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const userLocale = navigator.language || 'en-US';
  const dateFormatter = new Intl.DateTimeFormat(userLocale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

  if (date >= today) {
    return 'Today';
  } else if (date >= yesterday) {
    return 'Yesterday';
  } else if (date >= lastWeek) {
    return 'Last week';
  } else {
    return dateFormatter.format(date);
  }
}

function truncateString(str: string, maxLength: number): string {
  if (str.length > maxLength) {
    return str.substring(0, maxLength - 3) + '...';
  } else {
    return str;
  }
}
