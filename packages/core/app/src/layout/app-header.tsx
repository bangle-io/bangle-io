import { checkWidescreen, cx } from '@bangle.io/base-utils';
import { useCoreServices } from '@bangle.io/context';
import {
  Breadcrumb,
  Button,
  Separator,
  Sidebar,
} from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { useAtom, useAtomValue } from 'jotai';
import { ChevronsRightLeft, Home, MoveHorizontal } from 'lucide-react';
import React from 'react';
import { NoteBreadcrumb } from '../components/navigation/note-breadcrumb';
import { WsNameBreadcrumb } from '../components/navigation/ws-name-breadcrumb'; // Import WsNameBreadcrumb

const isWideScreen = checkWidescreen();

export interface AppHeaderProps {
  children?: React.ReactNode;
}

/** The main application header container, holding the toolbar content and optional children. */
export function AppHeader({ children }: AppHeaderProps) {
  const coreServices = useCoreServices();
  const wsPaths = useAtomValue(coreServices.workspaceState.$wsPaths);
  const currentWsPath = useAtomValue(
    coreServices.workspaceState.$currentWsPath,
  );
  const currentWsName = useAtomValue(
    coreServices.workspaceState.$currentWsName,
  );
  const [wideEditor, setWideEditor] = useAtom(
    coreServices.workbenchState.$wideEditor,
  );

  const showEditorToolbar = Boolean(currentWsPath);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      <div className="flex h-full flex-1 items-center justify-between">
        <ToolbarLeftSection
          showEditorToolbar={showEditorToolbar}
          currentWsPath={currentWsPath?.wsPath}
          currentWsName={currentWsName}
          wsPaths={wsPaths.map((wsPath) => wsPath.wsPath)}
        />
        {showEditorToolbar && currentWsName && (
          <ToolbarRightSection
            wideEditor={wideEditor}
            toggleEditor={() => {
              setWideEditor((prev) => !prev);
            }}
          />
        )}
      </div>
      {children}
    </header>
  );
}

interface ToolbarLeftSectionProps {
  showEditorToolbar: boolean;
  currentWsPath: string | undefined;
  currentWsName: string | undefined;
  wsPaths: string[];
}

function ToolbarLeftSection({
  showEditorToolbar,
  currentWsPath,
  currentWsName,
  wsPaths,
}: ToolbarLeftSectionProps) {
  const coreServices = useCoreServices();

  return (
    <div className="flex items-center gap-2">
      <Sidebar.SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      {showEditorToolbar && currentWsPath ? (
        <NoteBreadcrumb
          wsPath={currentWsPath}
          wsPaths={wsPaths}
          onNewNote={({ wsPath }) => {
            const parent = WsPath.fromString(wsPath).getParent();
            const path = parent?.path;

            coreServices.commandDispatcher.dispatch(
              'command::ui:create-note-dialog',
              {
                prefillName: path || '',
              },
              'AppHeader',
            );
          }}
        />
      ) : currentWsName ? (
        <WsNameBreadcrumb wsName={currentWsName} />
      ) : (
        <HomeBreadcrumb coreServices={coreServices} />
      )}
    </div>
  );
}

function HomeBreadcrumb({
  coreServices,
}: { coreServices: ReturnType<typeof useCoreServices> }) {
  return (
    <Breadcrumb.Breadcrumb>
      <Breadcrumb.BreadcrumbList>
        <Breadcrumb.BreadcrumbItem>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Breadcrumb.BreadcrumbLink
              href={coreServices.navigation.toUri({
                route: 'welcome',
                payload: {},
              })}
              title={t.app.common.home}
            >
              <Home size={16} />
            </Breadcrumb.BreadcrumbLink>
          </Button>
        </Breadcrumb.BreadcrumbItem>
      </Breadcrumb.BreadcrumbList>
    </Breadcrumb.Breadcrumb>
  );
}

interface ToolbarRightSectionProps {
  wideEditor: boolean;
  toggleEditor: () => void;
}

function ToolbarRightSection({
  wideEditor,
  toggleEditor,
}: ToolbarRightSectionProps) {
  return (
    <div className="flex items-center">
      {isWideScreen && (
        <Button
          variant="ghost"
          size="icon"
          className="ml-2 h-7 w-7"
          onClick={toggleEditor}
          title={t.app.toolbar.toggleMaxWidth}
        >
          {wideEditor ? (
            <ChevronsRightLeft size={18} />
          ) : (
            <MoveHorizontal size={18} />
          )}
          <span className="sr-only">{t.app.toolbar.toggleMaxWidth}</span>
        </Button>
      )}
    </div>
  );
}
