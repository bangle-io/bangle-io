import {
  AudioWaveform,
  Check,
  ChevronRight,
  ChevronsUpDown,
  Command as CommandIcon,
  File as FileIcon,
  Folder,
  GalleryVerticalEnd,
  Plus,
  Search,
  X as XIcon,
} from 'lucide-react';
import React from 'react';

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
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from './dropdown-menu';

import { Label } from './label';

import {
  Sidebar,
  SidebarContent,
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

type NavItem = {
  title: string;
  url: string;
  isActive?: boolean;
  items?: NavItem[];
};

type TreeItem = string | [string, ...TreeItem[]];

type Workspace = { name: string; logo?: React.ElementType; misc: string };

interface AppSidebarProps {
  onOpenWorkspace: () => void;
  workspaces: Workspace[];
  tree: TreeItem[];
  navItems: NavItem[];
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
}

export function AppSidebar({
  onOpenWorkspace,
  workspaces,
  tree,
  navItems,
  searchValue = '',
  onSearchValueChange = () => {},
}: AppSidebarProps) {
  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <WorkspaceSwitcher
          workspace={workspaces}
          onOpenWorkspace={onOpenWorkspace}
        />
        <SearchForm value={searchValue} onChange={onSearchValueChange} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <a href={item.url} className="font-medium">
                    {item.title}
                  </a>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild isActive={item.isActive}>
                          <a href={item.url}>{item.title}</a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tree.map((item, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                <Tree key={index} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function Tree({ item }: { item: TreeItem }) {
  const [name, ...items] = Array.isArray(item) ? item : [item];
  if (!items.length) {
    return (
      <SidebarMenuButton
        isActive={name === 'button.tsx'}
        className="data-[active=true]:bg-transparent"
      >
        <FileIcon />
        {name}
      </SidebarMenuButton>
    );
  }
  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={name === 'components' || name === 'ui'}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <ChevronRight className="transition-transform" />
            <Folder />
            {name}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((subItem, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              <Tree key={index} item={subItem} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function SearchForm({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search
          </Label>
          <SidebarInput
            id="search"
            placeholder="Search the docs..."
            className="pl-8"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-4 select-none opacity-50" />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="-translate-y-1/2 absolute top-1/2 right-2 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2"
            >
              <XIcon className="size-4" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  );
}

function WorkspaceSwitcher({
  workspace,
  onOpenWorkspace,
}: {
  workspace: Workspace[];
  onOpenWorkspace: () => void;
}) {
  const { isMobile } = useSidebar();
  const [activeWs, setActiveWs] = React.useState(workspace[0]);
  if (!activeWs) {
    return null;
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
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>
            {workspace.map((workspace, index) => {
              const Logo = workspace.logo ? workspace.logo : GalleryVerticalEnd;

              return (
                <DropdownMenuItem
                  key={workspace.name}
                  onClick={() => setActiveWs(workspace)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <Logo className="size-4 shrink-0" />
                  </div>
                  {workspace.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={onOpenWorkspace}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                Open Workspace
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
