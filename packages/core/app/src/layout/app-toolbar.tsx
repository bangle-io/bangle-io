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

const isWideEditor = checkWidescreen();

/** The main application toolbar containing navigation controls like sidebar toggle, breadcrumbs, and editor width toggle. */
export function AppToolbar() {
  const coreServices = useCoreServices();
  const wsPaths = useAtomValue(coreServices.workspaceState.$wsPaths);
  const wsPath = useAtomValue(coreServices.workspaceState.$currentWsPath);
  const wsName = useAtomValue(coreServices.workspaceState.$wsName);
  const [wideEditor, setWideEditor] = useAtom(
    coreServices.workbenchState.$wideEditor,
  );

  const showEditorToolbar = Boolean(wsPath);

  return (
    // Removed outer header wrapper, as AppHeader now handles it
    <div className="flex h-full flex-1 items-center justify-between">
      <ToolbarLeftSection
        showEditorToolbar={showEditorToolbar}
        wsPath={wsPath?.wsPath}
        wsPaths={wsPaths.map((wsPath) => wsPath.wsPath)}
      />
      {wsPath && wsName && (
        <ToolbarRightSection
          showEditorToolbar={showEditorToolbar}
          wideEditor={wideEditor}
          toggleEditor={() => {
            setWideEditor((prev) => !prev);
          }}
        />
      )}
    </div>
  );
}

interface ToolbarLeftSectionProps {
  showEditorToolbar: boolean;
  wsPath: string | undefined;
  wsPaths: string[];
}

function ToolbarLeftSection({
  showEditorToolbar,
  wsPath,
  wsPaths,
}: ToolbarLeftSectionProps) {
  const coreServices = useCoreServices();
  return (
    <div className="flex items-center space-x-2">
      <Sidebar.SidebarTrigger className="-ml-1" />
      {showEditorToolbar ? (
        <>
          <Separator orientation="vertical" className="h-4" />
          {wsPath ? (
            <NoteBreadcrumb
              wsPath={wsPath}
              wsPaths={wsPaths}
              onNewNote={({ wsPath }) => {
                const parent = WsPath.fromString(wsPath).getParent();
                const path = parent?.path;

                coreServices.commandDispatcher.dispatch(
                  'command::ui:create-note-dialog',
                  {
                    prefillName: path || '',
                  },
                  'AppToolbar',
                );
              }}
            />
          ) : null}
        </>
      ) : (
        <HomeBreadcrumb />
      )}
    </div>
  );
}

function HomeBreadcrumb() {
  const coreServices = useCoreServices();
  return (
    <>
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumb.Breadcrumb>
        <Breadcrumb.BreadcrumbList>
          <Breadcrumb.BreadcrumbItem>
            <Breadcrumb.BreadcrumbLink
              href={coreServices.navigation.toUri({
                route: 'welcome',
                payload: {},
              })}
              title={t.app.common.home}
            >
              <Home size={16} />
            </Breadcrumb.BreadcrumbLink>
          </Breadcrumb.BreadcrumbItem>
        </Breadcrumb.BreadcrumbList>
      </Breadcrumb.Breadcrumb>
    </>
  );
}

interface ToolbarRightSectionProps {
  showEditorToolbar: boolean;
  wideEditor: boolean;
  toggleEditor: () => void;
}

function ToolbarRightSection({
  showEditorToolbar,
  wideEditor,
  toggleEditor,
}: ToolbarRightSectionProps) {
  return (
    <div className="flex items-center">
      {isWideEditor && showEditorToolbar && (
        <Button
          variant="ghost"
          size="icon"
          className="ml-2 h-7 w-7"
          onClick={() => toggleEditor()}
        >
          {wideEditor ? <ChevronsRightLeft /> : <MoveHorizontal />}
          <span className="sr-only">{t.app.toolbar.toggleMaxWidth}</span>
        </Button>
      )}
    </div>
  );
}
