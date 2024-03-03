import { Breadcrumbs, Item } from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import HomeIcon from '@spectrum-icons/workflow/Home';
import React from 'react';

import { COLOR_SCHEME, PAGE_ROUTE, PageRoute } from '@bangle.io/constants';
import { slicePage } from '@bangle.io/slice-page';
import { sliceUI } from '@bangle.io/slice-ui';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  IconBug,
  IconChevronDown,
  IconTwitter,
} from '@bangle.io/ui';
import { changeColorScheme } from '@bangle.io/window-utils';
import {
  locationHelpers,
  OpenedWsPaths,
  resolvePath,
  toFSPath,
} from '@bangle.io/ws-path';

export function Titlebar() {
  const { wsName = 'INVALID', openedWsPaths, location } = useTrack(slicePage);
  const pageRoute = locationHelpers.getPageRoute(location?.pathname);

  return (
    <div className="border-b px-1 md:px-2 h-full w-full flex items-center bg-background">
      <BreadcrumbView
        wsName={wsName}
        openedWsPaths={openedWsPaths}
        pageRoute={pageRoute}
      />
      <div className="flex-1" />
      <UserNav />
    </div>
  );
}

function BreadcrumbView({
  wsName,
  openedWsPaths,
  pageRoute,
}: {
  wsName: string;
  openedWsPaths: OpenedWsPaths;
  pageRoute: PageRoute | undefined;
}) {
  const store = useStore();

  if (pageRoute === PAGE_ROUTE.workspaceSelect) {
    return (
      <Breadcrumbs size="S">
        <Item key={'welcome'}>Workspaces</Item>
      </Breadcrumbs>
    );
  }

  if (pageRoute === PAGE_ROUTE.notFound) {
    return (
      <Breadcrumbs size="S">
        <Item key={'welcome'}>Not Found</Item>
      </Breadcrumbs>
    );
  }

  if (pageRoute === PAGE_ROUTE.unknown) {
    return null;
  }

  if (pageRoute === PAGE_ROUTE.workspaceHome) {
    return (
      <Breadcrumbs size="S">
        <Item key={'welcome'}>{wsName}</Item>
      </Breadcrumbs>
    );
  }

  if (pageRoute === PAGE_ROUTE.workspaceNativeFsAuth) {
    return (
      <Breadcrumbs size="S">
        <Item key={'auth'}>Authorization</Item>
      </Breadcrumbs>
    );
  }

  if (pageRoute === PAGE_ROUTE.editor) {
    const primaryWsPath = openedWsPaths.primaryWsPath;

    if (primaryWsPath === undefined) {
      return (
        <Breadcrumbs size="S">
          <Item key={'ws'}>
            <HomeIcon size="S" />
          </Item>
          <Item key={wsName}>{wsName}</Item>
        </Breadcrumbs>
      );
    }

    const pathParts = toFSPath(primaryWsPath).split('/').filter(Boolean);

    return (
      <Breadcrumbs
        size="S"
        showRoot
        onAction={(key) => {
          if (key === 'ws') {
            store.dispatch(
              slicePage.actions.goTo((location) =>
                locationHelpers.goToWorkspaceHome(location, wsName),
              ),
            );
          }
        }}
      >
        {pathParts.map((part, i): any => {
          if (i === 0) {
            return (
              <Item key={'ws'}>
                <HomeIcon size="S" />
              </Item>
            );
          }
          return <Item key={i}>{part}</Item>;
        })}
      </Breadcrumbs>
    );
  }

  return null;
}

function UserNav() {
  const { colorScheme } = useTrack(sliceUI);
  const store = useStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="px-1" size="sm">
          <Avatar className="h-6 w-6 select-none ">
            <AvatarImage src="maskable_icon_x192.png" alt="bangle" />
            <AvatarFallback>BG</AvatarFallback>
          </Avatar>
          <span>
            <IconChevronDown className="pl-1" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Bangle.io</p>
            <p className="text-xs leading-none text-muted-foreground">
              Note Taking App
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            New Workspace
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              store.dispatch(
                slicePage.actions.goTo((location) =>
                  locationHelpers.goToWorkspaceSelection(location),
                ),
              );
            }}
          >
            Switch Workspace
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              changeColorScheme(
                colorScheme === COLOR_SCHEME.DARK
                  ? COLOR_SCHEME.LIGHT
                  : COLOR_SCHEME.DARK,
              );
            }}
          >
            Switch Dark/Light Mode
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => {
            window.open('https://twitter.com/bangle_io', '_blank');
          }}
        >
          <span>Twitter</span>
          <DropdownMenuShortcut>
            <IconTwitter className="h-4 w-4 ml-1  text-muted-foreground" />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            window.open(
              'https://github.com/bangle-io/bangle-io/issues',
              '_blank',
            );
          }}
        >
          <span>Report Issue</span>
          <DropdownMenuShortcut>
            <IconBug className="h-4 w-4 ml-1  text-muted-foreground" />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
