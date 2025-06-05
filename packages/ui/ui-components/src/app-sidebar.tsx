import {
  ChevronsUpDown,
  GalleryVerticalEnd,
  Plus,
  PlusIcon,
  Search,
} from 'lucide-react';
import React, { useMemo } from 'react';
import bangleIcon from './bangle-transparent_x512.png';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

import { Label } from './label';

import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { type TreeItem, buildTree } from './build-tree';
import { cn } from './cn';
import { Tree, type TreeProps } from './Tree';
import { KbdShortcut } from './kbd';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
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
  onSearchClick?: () => void;
  onTreeItemClick: (item: TreeItem) => void;
  activeWsPaths?: string[];
  onNewFileClick: () => void;
  onDeleteFileClick?: (item: TreeItem) => void;
  onRenameFileClick?: (item: TreeItem) => void;
  onMoveFileClick?: (item: TreeItem) => void;
  onTreeItemCreateNote?: (item: TreeItem) => void;
  isTruncated?: boolean;
  onTruncatedClick?: () => void;
  onFileDrop?: TreeProps['onFileDrop'];
  footerChildren?: React.ReactNode;
  footerTitle?: string;
  footerSubtitle?: string;
  wsPathToHref?: (wsPath: string) => string;
  wsNameToHref: (wsName: string) => string;
};

interface DropdownButtonProps {
  icon?: React.ElementType;
  imageSrc?: string;
  title: string;
  subtitle: string;
  fancy?: boolean;
  className?: string;
}

function DropdownButton({
  icon: IconComponent,
  imageSrc,
  title,
  subtitle,
  fancy = false,
  className,
}: DropdownButtonProps) {
  const getButtonClass = (isFancy: boolean) =>
    cn(
      'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
      isFancy &&
        'shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_2px_25px_rgba(255,255,255,0.25)]' +
          'border border-sidebar-accent dark:border-sidebar-accent-foreground',
      className,
    );

  const textClass = cn(
    'grid flex-1 text-left text-sm leading-tight select-none',
    fancy && 'font-bold tracking-tight',
  );

  const subtitleClass = cn('truncate text-xs', fancy && 'font-medium');

  return (
    <DropdownMenuTrigger asChild>
      <SidebarMenuButton size="lg" className={cn(getButtonClass(fancy))}>
        {imageSrc ? (
          <div className="flex aspect-square size-10 items-center justify-center overflow-hidden rounded-lg text-sidebar-primary-foreground">
            <img
              src={imageSrc}
              alt={title}
              className="size-8 select-none object-contain"
            />
          </div>
        ) : (
          IconComponent && (
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
              <IconComponent className="size-4" />
            </div>
          )
        )}
        <div className={textClass}>
          <span
            className={cn('font-semibold', fancy && 'text-base leading-snug')}
          >
            {title}
          </span>
          <span className={subtitleClass}>{subtitle}</span>
        </div>
        <ChevronsUpDown className="ml-auto" />
      </SidebarMenuButton>
    </DropdownMenuTrigger>
  );
}

export function AppSidebar({
  onNewWorkspaceClick,
  workspaces,
  wsPaths,
  navItems,
  onSearchClick = () => {},
  activeWsPaths = [],
  onTreeItemClick,
  onNewFileClick,
  onDeleteFileClick = () => {},
  onRenameFileClick = () => {},
  onMoveFileClick = () => {},
  onTreeItemCreateNote = () => {},
  isTruncated = false,
  onTruncatedClick = () => {},
  onFileDrop = () => {},
  footerChildren,
  footerTitle,
  footerSubtitle,
  wsPathToHref,
  wsNameToHref,
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
          onNewWorkspaceClick={onNewWorkspaceClick}
          wsNameToHref={wsNameToHref}
        />
        <CommandButton onClick={() => onSearchClick?.()} />
      </SidebarHeader>
      <SidebarContent>
        {navItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {t.app.components.appSidebar.openedLabel}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a
                      href={wsPathToHref ? wsPathToHref(item.wsPath) : '#dead'}
                      className="font-medium"
                    >
                      {item.title}
                    </a>
                  </SidebarMenuButton>
                  {item.items?.length ? (
                    <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                      {item.items.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild>
                            <a
                              href={
                                wsPathToHref
                                  ? wsPathToHref(item.wsPath)
                                  : '#dead'
                              }
                            >
                              {item.title}
                            </a>
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
          <SidebarGroupLabel
            onClick={() => {
              onTruncatedClick();
            }}
            className="cursor-pointer select-none"
          >
            {t.app.components.appSidebar.filesLabel}
          </SidebarGroupLabel>
          <SidebarGroupAction
            title={t.app.components.appSidebar.newFileActionTitle}
            onClick={() => {
              onNewFileClick();
            }}
          >
            <PlusIcon />
            <span className="sr-only">
              {t.app.components.appSidebar.newFileActionSr}
            </span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              <Tree
                rootItem={tree}
                activeWsPaths={activeWsPaths}
                onTreeItemClick={onTreeItemClick}
                onTreeItemDelete={onDeleteFileClick}
                onTreeItemRename={onRenameFileClick}
                onTreeItemMove={onMoveFileClick}
                onTreeItemCreateNote={onTreeItemCreateNote}
                onFileDrop={onFileDrop}
                wsPathToHref={wsPathToHref}
              />
              {isTruncated && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onTruncatedClick}>
                    {t.app.components.appSidebar.showMoreButton}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {footerChildren && (
        <AppSidebarFooter
          title={footerTitle}
          subtitle={footerSubtitle}
          dropdownPosition="top"
        >
          {footerChildren}
        </AppSidebarFooter>
      )}
    </Sidebar>
  );
}

function AppSidebarFooter({
  children,
  title = 'Bangle.io',
  subtitle = '',
  dropdownPosition = 'right',
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  dropdownPosition?: 'bottom' | 'right' | 'top' | 'left';
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarFooter>
      <DropdownMenu>
        <DropdownButton
          imageSrc={bangleIcon}
          title={title}
          subtitle={subtitle}
          fancy={true}
        />
        <DropdownMenuContent
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          align="start"
          side={isMobile ? 'top' : dropdownPosition}
          sideOffset={4}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarFooter>
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
            {t.app.common.searchLabel}
          </Label>
          <SidebarInput
            id="command-button"
            placeholder={t.app.common.searchInputPlaceholder}
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
  onNewWorkspaceClick,
  wsNameToHref,
}: {
  workspaces: Workspace[];
  onNewWorkspaceClick: () => void;
  wsNameToHref: (wsName: string) => string;
}) {
  const { isMobile } = useSidebar();

  const activeWs = workspaces.find((ws) => ws.isActive);

  const Logo = activeWs?.logo ?? GalleryVerticalEnd;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownButton
            icon={Logo}
            title={
              activeWs
                ? activeWs.name
                : t.app.components.appSidebar.noWorkspaceSelectedTitle
            }
            subtitle={
              activeWs
                ? activeWs.misc
                : t.app.components.appSidebar.noWorkspaceSelectedSubtitle
            }
            className={
              !activeWs
                ? 'bg-pop/10 hover:bg-pop/15 data-[state=open]:bg-pop/15'
                : undefined
            }
          />

          <DropdownMenuContent
            className="max-h-[400px] w-(--radix-dropdown-menu-trigger-width) min-w-56 overflow-y-auto rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t.app.components.appSidebar.workspacesLabel}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={onNewWorkspaceClick}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <span className="">{t.app.common.newWorkspace}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {workspaces.map((workspace) => {
              const LogoComponent = workspace.logo
                ? workspace.logo
                : GalleryVerticalEnd;

              return (
                <DropdownMenuItem
                  key={workspace.name}
                  className={cn(
                    'gap-2 p-2',
                    workspace.isActive && 'font-medium text-foreground',
                  )}
                  asChild
                >
                  <a
                    href={wsNameToHref(workspace.name)}
                    className="flex items-center"
                  >
                    <div className="flex size-6 items-center justify-center rounded-sm border">
                      <LogoComponent className="size-4 shrink-0" />
                    </div>
                    <span className={workspace.isActive ? 'underline' : ''}>
                      {workspace.name}
                    </span>
                    {workspace.isActive && (
                      <span className="ml-2 inline-block h-2 w-2 rounded-full bg-pop" />
                    )}
                  </a>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
