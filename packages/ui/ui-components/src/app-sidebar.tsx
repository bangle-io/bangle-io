import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Label,
} from '@bangle.io/shadcn';
import { ChevronsUpDown, GalleryVerticalEnd, Plus, Search } from 'lucide-react';
import React, { useId } from 'react';
import bangleIcon from './bangle-transparent_x512.png';
import {
  type FileTreeEntry,
  type FileTreeEntryAction,
  PierreFileTree,
} from './file-tree';
import { KbdShortcut } from './kbd';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
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
  filePaths: string[];
  navItems: NavItem[];
  onSearchClick?: () => void;
  activeFilePaths?: string[];
  getActionsForEntry: (
    entry: FileTreeEntry,
    selectedEntries: readonly FileTreeEntry[],
  ) => readonly FileTreeEntryAction[];
  onCreateDirectory: (pathPrefix: string | undefined) => void;
  onCreateNote: (pathPrefix: string | undefined) => void;
  onMoveFile: (
    sourceRelativePath: string,
    destinationDirectory: string | undefined,
  ) => void;
  onOpenFile: (relativePath: string) => void;
  showNoteFilesOnly: boolean;
  onShowNoteFilesOnlyChange: (showNoteFilesOnly: boolean) => void;
  footerChildren?: React.ReactNode;
  footerTitle?: string;
  footerSubtitle?: string;
  wsPathToHref?: (wsPath: string) => string;
  wsNameToHref: (wsName: string) => string;
  sidebarHeaderClassName?: string;
  workspaceSwitcherWrapperClassName?: string;
  commandButtonClassName?: string;
};

interface DropdownButtonProps {
  icon?: React.ElementType;
  imageSrc?: string;
  title: string;
  subtitle: string;
  fancy?: boolean;
  density?: 'default' | 'compact';
  className?: string;
}

function DropdownButton({
  icon: IconComponent,
  imageSrc,
  title,
  subtitle,
  fancy = false,
  density = 'default',
  className,
}: DropdownButtonProps) {
  const isCompact = density === 'compact';
  const getButtonClass = (isFancy: boolean) =>
    cn(
      'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
      isCompact && 'h-10 rounded-md px-2',
      isFancy &&
        'shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_2px_25px_rgba(255,255,255,0.25)]' +
          'border border-sidebar-accent dark:border-sidebar-accent-foreground',
      className,
    );

  const textClass = cn(
    'grid flex-1 text-left text-sm leading-tight select-none',
    fancy && 'font-bold tracking-tight',
  );

  const subtitleClass = cn(
    'truncate text-xs',
    isCompact && 'text-[11px] leading-3',
    fancy && 'font-medium',
  );

  return (
    <DropdownMenuTrigger asChild>
      <SidebarMenuButton
        size={isCompact ? 'default' : 'lg'}
        className={cn(getButtonClass(fancy))}
      >
        {imageSrc ? (
          <div
            className={cn(
              'flex aspect-square items-center justify-center overflow-hidden rounded-lg text-sidebar-primary-foreground',
              isCompact ? 'size-7' : 'size-10',
            )}
          >
            <img
              src={imageSrc}
              alt={title}
              className={cn(
                'select-none object-contain',
                isCompact ? 'size-5.5' : 'size-8',
              )}
            />
          </div>
        ) : (
          IconComponent && (
            <div
              className={cn(
                'flex aspect-square items-center justify-center rounded-lg',
                isCompact ? 'size-7' : 'size-8',
              )}
            >
              <IconComponent className={isCompact ? 'size-3.5' : 'size-4'} />
            </div>
          )
        )}
        <div className={textClass}>
          <span
            className={cn(
              'font-semibold',
              isCompact && 'leading-4',
              fancy && 'text-base leading-snug',
            )}
          >
            {title}
          </span>
          <span className={subtitleClass}>{subtitle}</span>
        </div>
        <ChevronsUpDown className="!size-3.5 ml-auto text-sidebar-foreground/55" />
      </SidebarMenuButton>
    </DropdownMenuTrigger>
  );
}

export function AppSidebar({
  onNewWorkspaceClick,
  workspaces,
  filePaths,
  navItems,
  onSearchClick = () => {},
  activeFilePaths = [],
  getActionsForEntry,
  onCreateDirectory,
  onCreateNote,
  onMoveFile,
  onOpenFile,
  showNoteFilesOnly,
  onShowNoteFilesOnlyChange,
  footerChildren,
  footerTitle,
  footerSubtitle,
  wsPathToHref,
  wsNameToHref,
  sidebarHeaderClassName,
  workspaceSwitcherWrapperClassName,
  commandButtonClassName,
}: AppSidebarProps) {
  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className={cn('gap-2 px-3 py-2', sidebarHeaderClassName)}>
        <div className={workspaceSwitcherWrapperClassName}>
          <WorkspaceSwitcher
            workspaces={workspaces}
            onNewWorkspaceClick={onNewWorkspaceClick}
            wsNameToHref={wsNameToHref}
          />
        </div>
        <CommandButton
          className={commandButtonClassName}
          onClick={() => onSearchClick?.()}
        />
      </SidebarHeader>
      <SidebarContent className="gap-1 overflow-hidden">
        {navItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {t.app.components.appSidebar.openedLabel}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title} className="min-w-0">
                  <SidebarMenuButton asChild>
                    <a
                      href={wsPathToHref ? wsPathToHref(item.wsPath) : '#dead'}
                      title={item.title}
                      className="min-w-0 font-medium"
                    >
                      <span className="block min-w-0 truncate">
                        {item.title}
                      </span>
                    </a>
                  </SidebarMenuButton>
                  {item.items?.length ? (
                    <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                      {item.items.map((item) => (
                        <SidebarMenuSubItem
                          key={item.title}
                          className="min-w-0"
                        >
                          <SidebarMenuSubButton asChild>
                            <a
                              href={
                                wsPathToHref
                                  ? wsPathToHref(item.wsPath)
                                  : '#dead'
                              }
                              title={item.title}
                              className="min-w-0"
                            >
                              <span className="block min-w-0 truncate">
                                {item.title}
                              </span>
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
        <SidebarGroup className="min-h-0 flex-1 overflow-hidden p-0 pt-0">
          <SidebarGroupLabel className="sr-only">
            {t.app.components.appSidebar.filesLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <PierreFileTree
              activePaths={activeFilePaths}
              filePaths={filePaths}
              getActionsForEntry={getActionsForEntry}
              onCreateDirectory={onCreateDirectory}
              onCreateNote={onCreateNote}
              onMoveFile={onMoveFile}
              onOpenFile={onOpenFile}
              showNoteFilesOnly={showNoteFilesOnly}
              onShowNoteFilesOnlyChange={onShowNoteFilesOnlyChange}
            />
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
    <SidebarFooter className="px-3 py-2">
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

function CommandButton({
  className,
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  const commandButtonId = useId();
  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: requires div wrapper for proper component styling integration
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyUp={(e) => e.key === 'Enter' && onClick()}
      className={cn('w-full cursor-pointer', className)}
    >
      <SidebarGroup className="p-0">
        <SidebarGroupContent className="relative">
          <Label htmlFor={commandButtonId} className="sr-only">
            {t.app.common.searchLabel}
          </Label>
          <SidebarInput
            id={commandButtonId}
            placeholder={t.app.common.searchInputPlaceholder}
            className="pointer-events-none h-8 rounded-md bg-background/70 pr-8 pl-8"
            readOnly
          />
          <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 select-none opacity-50" />
          <div className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm opacity-70">
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
            density="compact"
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
                ? 'bg-sidebar-accent/70 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent'
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
