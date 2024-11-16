import '@bangle.io/editor/src/style.css';

import { EditorComp } from '@bangle.io/editor';
import {
  AppSidebar,
  Breadcrumb,
  Sidebar,
  type TreeItem,
} from '@bangle.io/ui-components';
import { Separator } from '@bangle.io/ui-components';
import { WorkspaceDialogRoot } from '@bangle.io/ui-components';
import React, { useEffect } from 'react';

export function App() {
  const [input, setInput] = React.useState('');

  const updateInput = (value: string) => {
    setInput(value);
  };

  const data = {
    navMain: [
      {
        title: 'Getting Started',
        url: '#',
        items: [
          { title: 'Installation', url: '#' },
          { title: 'Project Structure', url: '#' },
        ],
      },
      {
        title: 'Building Your Application',
        url: '#',
        items: [
          { title: 'Routing', url: '#' },
          { title: 'Data Fetching', url: '#', isActive: true },
          // Other items...
        ],
      },
      // Other nav items...
    ],
    teams: [
      { name: 'Acme Inc', misc: 'Enterprise' },
      { name: 'Acme Corp.', misc: 'Startup' },
      { name: 'Evil Corp.', misc: 'Free' },
    ],
  };

  const tree: TreeItem[] = [
    'app',
    [
      'api',
      ['hello', ['route.ts']],
      'page.tsx',
      'layout.tsx',
      ['blog', ['page.tsx']],
    ],
  ];

  const [openWsDialog, setOpenWsDialog] = React.useState(false);

  return (
    <>
      <WorkspaceDialogRoot
        open={openWsDialog}
        onOpenChange={setOpenWsDialog}
        onDone={({ wsName }) => {
          setOpenWsDialog(false);
          console.log('Workspace name:', wsName);
        }}
      />
      <Sidebar.SidebarProvider>
        <AppSidebar
          workspaces={data.teams}
          tree={tree}
          navItems={data.navMain}
          searchValue={input}
          onSearchValueChange={updateInput}
          onOpenWorkspace={() => setOpenWsDialog(true)}
        />

        <Sidebar.SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <Sidebar.SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb.Breadcrumb>
              <Breadcrumb.BreadcrumbList>
                <Breadcrumb.BreadcrumbItem className="hidden md:block">
                  <Breadcrumb.BreadcrumbLink href="#">
                    Building Your Application
                  </Breadcrumb.BreadcrumbLink>
                </Breadcrumb.BreadcrumbItem>
                <Breadcrumb.BreadcrumbSeparator className="hidden md:block" />
                <Breadcrumb.BreadcrumbItem>
                  <Breadcrumb.BreadcrumbPage>
                    Data Fetching
                  </Breadcrumb.BreadcrumbPage>
                </Breadcrumb.BreadcrumbItem>
              </Breadcrumb.BreadcrumbList>
            </Breadcrumb.Breadcrumb>
          </header>
          <div className="B-app-main-content flex flex-1 flex-col gap-4 p-4 pt-0">
            <div>
              {/* <div className="grid auto-rows-min gap-4 md:grid-cols-3"> */}
              <EditorComp
                wsPath={'ws:test.md'}
                readNote={async (_wsPath) => {
                  return Array.from({ length: 100 }, () => [
                    '## hello world',
                    'test',
                  ])

                    .flat()
                    .join('\n');
                }}
                writeNote={async (_wsPath, _content) => {
                  // const { fileName } = resolvePath(wsPath);
                  // void workspace?.createFile(
                  //   wsPath,
                  //   new File([content], fileName, {
                  //     type: 'text/plain',
                  //   }),
                  // );
                }}
              />
            </div>
          </div>
        </Sidebar.SidebarInset>
      </Sidebar.SidebarProvider>
    </>
  );
}
