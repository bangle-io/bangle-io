import {
  ChevronRight,
  ChevronsUpDown,
  Command as CommandIcon,
  File as FileIcon,
  Folder,
  GalleryVerticalEnd,
  MoreHorizontal,
  Plus,
  PlusIcon,
  Search,
  X as XIcon,
} from 'lucide-react';
import React, { useMemo } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

import { Label } from './label';

import { cx } from '@bangle.io/base-utils';
import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { type TreeItem, buildTree } from '@bangle.io/ui-utils';
import { Button } from './button';
import { KbdShortcut } from './kbd';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from './sidebar';

export type NavItem = {
  title: string;
  wsPath: string;
  isActive?: boolean;
  items?: NavItem[];
};

type Workspace = {
  name: string;
  logo?: React.ElementType;
  misc: string;
  isActive?: boolean;
};

export type AppSidebarProps = {
  onNewWorkspaceClick: () => void;
  workspaces: Workspace[];
  wsPaths: string[];
  navItems: NavItem[];
  setActiveWorkspace: (name: string) => void;
  onSearchClick?: () => void;
  onTreeItemClick: (item: TreeItem) => void;
  activeWsPaths?: string[];
  onNewFileClick: () => void;
  onDeleteFileClick?: (item: TreeItem) => void;
  onRenameFileClick?: (item: TreeItem) => void;
  onMoveFileClick?: (item: TreeItem) => void;
  isTruncated?: boolean;
  onTruncatedClick?: () => void;
};

export function AppSidebar({
  onNewWorkspaceClick,
  workspaces,
  wsPaths,
  navItems,
  setActiveWorkspace,
  onSearchClick = () => {},
  activeWsPaths = [],
  onTreeItemClick,
  onNewFileClick,
  onDeleteFileClick = () => {},
  onRenameFileClick = () => {},
  onMoveFileClick = () => {},
  isTruncated = false,
  onTruncatedClick = () => {},
}: AppSidebarProps) {
  const tree = useMemo(
    () => buildTree(wsPaths, activeWsPaths, undefined),
    [wsPaths, activeWsPaths],
  );

  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <WorkspaceSwitcher
          workspaces={workspaces}
          setActiveWorkspace={setActiveWorkspace}
          onNewWorkspaceClick={onNewWorkspaceClick}
        />
        <CommandButton onClick={() => onSearchClick?.()} />
      </SidebarHeader>
      <SidebarContent>
        {navItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Opened</SidebarGroupLabel>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href="#dead" className="font-medium">
                      {item.title}
                    </a>
                  </SidebarMenuButton>
                  {item.items?.length ? (
                    <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                      {item.items.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild>
                            <a href="#dead">{item.title}</a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarGroupAction
            title="New File"
            onClick={() => {
              onNewFileClick();
            }}
          >
            <PlusIcon />
            <span className="sr-only">Create File</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {tree.map((item, index) => (
                <Tree
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  key={index}
                  item={item}
                  activeWsPaths={activeWsPaths}
                  onTreeItemClick={onTreeItemClick}
                  onTreeItemDelete={onDeleteFileClick}
                  onTreeItemRename={onRenameFileClick}
                  onTreeItemMove={onMoveFileClick}
                />
              ))}
              {isTruncated && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onTruncatedClick}>
                    Show More
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function Tree({
  item,
  onTreeItemClick,
  onTreeItemDelete,
  onTreeItemRename,
  onTreeItemMove,
  activeWsPaths,
}: {
  activeWsPaths: string[];
  item: TreeItem;
  onTreeItemClick: (item: TreeItem) => void;
  onTreeItemDelete: (item: TreeItem) => void;
  onTreeItemRename: (item: TreeItem) => void;
  onTreeItemMove: (item: TreeItem) => void;
}) {
  if (!item.isDir) {
    const isActive = item.wsPath && activeWsPaths.includes(item.wsPath);
    return (
      <SidebarMenuItem
        className={cx(isActive && 'bg-sidebar-accent')}
        style={{
          contentVisibility: 'auto',
        }}
      >
        <SidebarMenuButton
          className="data-[active=true]:bg-transparent"
          onClick={() => onTreeItemClick(item)}
          isActive={item.isOpen}
          size="sm"
        >
          <FileIcon
            className={cx(
              isActive ? 'fill-current text-accent' : 'text-inherit',
            )}
          />
          <span className={cx(isActive ? 'font-semibold' : '')}>
            {item.name}
          </span>
        </SidebarMenuButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover>
              <MoreHorizontal />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem
              onClick={() => {
                onTreeItemRename(item);
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onTreeItemDelete(item);
              }}
            >
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onTreeItemMove(item);
              }}
            >
              Move
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={item.isOpen ?? false}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton size="sm">
            <ChevronRight className="transition-transform" />
            <Folder />
            {item.name}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((subItem, index) => (
              <Tree
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                key={index}
                item={subItem}
                onTreeItemClick={onTreeItemClick}
                onTreeItemDelete={onTreeItemDelete}
                onTreeItemRename={onTreeItemRename}
                onTreeItemMove={onTreeItemMove}
                activeWsPaths={activeWsPaths}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function CommandButton({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      onKeyUp={(e) => e.key === 'Enter' && onClick()}
      className="w-full cursor-pointer"
    >
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          <Label htmlFor="command-button" className="sr-only">
            Search
          </Label>
          <SidebarInput
            id="command-button"
            placeholder="Search..."
            className="pointer-events-none pr-8 pl-8"
            readOnly
          />
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-4 select-none opacity-50" />
          <div className="-translate-y-1/2 absolute top-1/2 right-2 rounded-sm opacity-70">
            <KbdShortcut keys={KEYBOARD_SHORTCUTS.toggleOmniSearch.keys} />
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}

function WorkspaceSwitcher({
  workspaces,
  setActiveWorkspace,
  onNewWorkspaceClick,
}: {
  workspaces: Workspace[];
  setActiveWorkspace: (name: string) => void;
  onNewWorkspaceClick: () => void;
}) {
  const { isMobile } = useSidebar();
  let activeWs = workspaces.find((ws) => ws.isActive);

  if (!activeWs) {
    activeWs = {
      name: 'Acme Inc Enterprise',
      isActive: true,
      misc: 'Enterprise',
    };
  }

  const Logo = activeWs.logo ? activeWs.logo : GalleryVerticalEnd;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{activeWs.name}</span>
                <span className="truncate text-xs">{activeWs.misc}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace) => {
              const LogoComponent = workspace.logo
                ? workspace.logo
                : GalleryVerticalEnd;

              return (
                <DropdownMenuItem
                  key={workspace.name}
                  onClick={() => setActiveWorkspace(workspace.name)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <LogoComponent className="size-4 shrink-0" />
                  </div>
                  {workspace.name}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={onNewWorkspaceClick}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                New Workspace
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
