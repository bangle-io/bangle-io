import type { Meta, StoryObj } from '@storybook/react';
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
} from 'lucide-react';
import React from 'react';
import { AppSidebar } from './app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb';
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
import { Separator } from './separator';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from './sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Sidebar',
  component: Sidebar,
  argTypes: {},
  decorators: [],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type NavItem = {
  title: string;
  wsPath: string;
  isActive?: boolean; // Optional property to indicate if the item is active
  items?: NavItem[]; // Recursive type to allow nested navigation
};

export function AppSidebarExample() {
  const [open, setOpen] = React.useState(true);
  return (
    <SidebarProvider
      open={open}
      setOpen={setOpen}
      style={
        {
          '--BV-sidebar-width': '19rem',
        } as React.CSSProperties
      }
    >
      <AppSidebar
        onNewFileClick={() => {}}
        workspaces={data.teams}
        wsPaths={data.tree}
        navItems={data.navMain}
        onTreeItemClick={() => {}}
        // searchValue={input}
        // onSearchValueChange={updateInput}
        onNewWorkspaceClick={() => {}}
        setActiveWorkspace={() => {}}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">
                  Building Your Application
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
          </div>
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppSidebarTruncatedExample() {
  const [open, setOpen] = React.useState(true);
  return (
    <SidebarProvider
      open={open}
      setOpen={setOpen}
      style={
        {
          '--BV-sidebar-width': '19rem',
        } as React.CSSProperties
      }
    >
      <AppSidebar
        onNewFileClick={() => {}}
        workspaces={data.teams}
        wsPaths={data.tree}
        navItems={data.navMain}
        onTreeItemClick={() => {}}
        isTruncated={true}
        onTruncatedClick={() => {
          alert('truncated called');
        }}
        onNewWorkspaceClick={() => {}}
        setActiveWorkspace={() => {}}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">
                  Building Your Application
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
          </div>
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

const data = {
  navMain: [
    {
      title: 'Getting Started',
      wsPath: 'dead:route.md',
      items: [
        {
          title: 'Installation',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Project Structure',
          wsPath: 'dead:route.md',
        },
      ],
    },
    {
      title: 'Building Your Application',
      wsPath: 'dead:route.md',
      items: [
        {
          title: 'Routing',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Data Fetching',
          wsPath: 'dead:route.md',
          isActive: true,
        },
        {
          title: 'Rendering',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Caching',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Styling',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Optimizing',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Configuring',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Testing',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Authentication',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Deploying',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Upgrading',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Examples',
          wsPath: 'dead:route.md',
        },
      ],
    },
    {
      title: 'API Reference',
      wsPath: 'dead:route.md',
      items: [
        {
          title: 'Components',
          wsPath: 'dead:route.md',
        },
        {
          title: 'File Conventions',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Functions',
          wsPath: 'dead:route.md',
        },
        {
          title: 'next.config.js Options',
          wsPath: 'dead:route.md',
        },
        {
          title: 'CLI',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Edge Runtime',
          wsPath: 'dead:route.md',
        },
      ],
    },
    {
      title: 'Architecture',
      wsPath: 'dead:route.md',
      items: [
        {
          title: 'Accessibility',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Fast Refresh',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Next.js Compiler',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Supported Browsers',
          wsPath: 'dead:route.md',
        },
        {
          title: 'Turbopack',
          wsPath: 'dead:route.md',
        },
      ],
    },
    {
      title: 'Community',
      wsPath: 'dead:route.md',
      items: [
        {
          title: 'Contribution Guide',
          wsPath: 'dead:route.md',
        },
      ],
    },
  ] satisfies NavItem[],
  tree: [
    'test:app/api/page.tsx',
    'test:app/api/layout.tsx',
    'test:components/ui/button.tsx',
    'test:components/ui/card.tsx',
    'test:components/header.tsx',
    'test:components/footer.tsx',
    'test:lib/util.ts',
    'test:lib/public/favicon.ico',
    'test:lib/public/vercel.svg',
    'test:public/favicon.ico',
    'test:public/vercel.svg',
    'test:.eslintrc.json',
    'test:.gitignore',
    'test:next.config.js',
    'test:tailwind.config.js',
    'test:package.json',
    'test:README.md',
  ],
  versions: ['1.0.1', '1.1.0-alpha', '2.0.0-beta1'],
  teams: [
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      misc: 'Enterprise',
      isActive: true,
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      misc: 'Startup',
    },
    {
      name: 'Evil Corp.',
      logo: CommandIcon,
      misc: 'Free',
    },
  ],
};

function AppSidebar2({
  workspaces,
  tree,
  navItems,
}: {
  workspaces: { name: string; logo?: React.ElementType; misc: string }[];
  tree: TreeItem[];
  navItems: NavItem[];
}) {
  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <TeamSwitcher teams={workspaces} />
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <a href={item.wsPath} className="font-medium">
                    {item.title}
                  </a>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild isActive={item.isActive}>
                          <a href={item.wsPath}>{item.title}</a>
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

type TreeItem = string | [string, ...TreeItem[]];

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

function SearchForm({ ...props }: React.ComponentProps<'form'>) {
  return (
    <form {...props}>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search
          </Label>
          <SidebarInput
            id="search"
            placeholder="Search the docs..."
            className="pl-8"
          />
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-4 select-none opacity-50" />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  );
}

function VersionSwitcher({
  versions,
  defaultVersion,
}: {
  versions: string[];
  defaultVersion: string;
}) {
  const [selectedVersion, setSelectedVersion] = React.useState(defaultVersion);
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
                <GalleryVerticalEnd className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Documentation</span>
                <span className="">v{selectedVersion}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width]"
            align="start"
          >
            {versions.map((version) => (
              <DropdownMenuItem
                key={version}
                onSelect={() => setSelectedVersion(version)}
              >
                v{version}{' '}
                {version === selectedVersion && <Check className="ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string;
    logo?: React.ElementType;
    misc: string;
  }[];
}) {
  const { isMobile } = useSidebar();
  const [activeTeam, setActiveTeam] = React.useState(teams[0]);
  if (!activeTeam) {
    return null;
  }

  const Logo = activeTeam.logo ? activeTeam.logo : GalleryVerticalEnd;

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
                <span className="truncate font-semibold">
                  {activeTeam.name}
                </span>
                <span className="truncate text-xs">{activeTeam.misc}</span>
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
              Teams
            </DropdownMenuLabel>
            {teams.map((team, index) => {
              const Logo = team.logo ? team.logo : GalleryVerticalEnd;

              return (
                <DropdownMenuItem
                  key={team.name}
                  onClick={() => setActiveTeam(team)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <Logo className="size-4 shrink-0" />
                  </div>
                  {team.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
