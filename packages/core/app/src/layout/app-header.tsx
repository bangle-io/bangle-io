import { checkWidescreen } from '@bangle.io/base-utils';
import { useCoreServices } from '@bangle.io/context';
import {
  Breadcrumb,
  Button,
  buttonVariants,
  cn,
  DropdownMenu,
  Separator,
  Sidebar,
  StarButton,
} from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { useAtom, useAtomValue } from 'jotai';
import {
  ChevronsRightLeft,
  EllipsisVertical,
  Home,
  MoveHorizontal,
} from 'lucide-react';
import React from 'react';
import { MarkdownFidelityNotice } from '../components/navigation/markdown-fidelity-notice';
import { NoteBreadcrumb } from '../components/navigation/note-breadcrumb';
import { WsNameBreadcrumb } from '../components/navigation/ws-name-breadcrumb'; // Import WsNameBreadcrumb
import { getSingleNoteActions } from '../components/note-actions/single-note-actions';

const isWideScreen = checkWidescreen();

export interface AppHeaderProps {
  children?: React.ReactNode;
}

/** The main application header container, holding the toolbar content and optional children. */
export function AppHeader({ children }: AppHeaderProps) {
  const coreServices = useCoreServices();
  const wsPaths = useAtomValue(coreServices.workspaceState.$noteWsPaths);
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
    <header className="desktop-titlebar-drag desktop-titlebar-surface flex h-[var(--bangle-app-titlebar-height)] max-h-[var(--bangle-app-titlebar-height)] min-h-[var(--bangle-app-titlebar-height)] shrink-0 items-center gap-2 overflow-hidden px-3">
      <div
        aria-hidden="true"
        className="desktop-titlebar-main-spacer shrink-0"
      />
      <div className="flex h-full min-w-0 flex-1 items-center gap-2">
        <ToolbarLeftSection
          showEditorToolbar={showEditorToolbar}
          currentWsPath={currentWsPath?.wsPath}
          currentWsName={currentWsName}
          wsPaths={wsPaths.map((wsPath) => wsPath.wsPath)}
        />
        {currentWsPath && currentWsName && (
          <ToolbarRightSection
            currentWsPath={currentWsPath.wsPath}
            wideEditor={wideEditor}
            toggleEditor={() => {
              setWideEditor((prev) => !prev);
            }}
          />
        )}
      </div>
      {children ? (
        <div className="desktop-titlebar-no-drag">{children}</div>
      ) : null}
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
    <div className="desktop-titlebar-no-drag flex min-w-0 flex-1 items-center gap-2">
      <Sidebar.SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      {showEditorToolbar && currentWsPath ? (
        <>
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
          <div className="shrink-0">
            <MarkdownFidelityNotice wsPath={currentWsPath} />
          </div>
        </>
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
}: {
  coreServices: ReturnType<typeof useCoreServices>;
}) {
  return (
    <Breadcrumb.Breadcrumb>
      <Breadcrumb.BreadcrumbList>
        <Breadcrumb.BreadcrumbItem>
          <Breadcrumb.BreadcrumbLink
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              'h-7 w-7',
            )}
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
  );
}

interface ToolbarRightSectionProps {
  currentWsPath: string;
  wideEditor: boolean;
  toggleEditor: () => void;
}

function ToolbarRightSection({
  currentWsPath,
  wideEditor,
  toggleEditor,
}: ToolbarRightSectionProps) {
  const coreServices = useCoreServices();
  const isCurrentWsPathStarred = useAtomValue(
    coreServices.userActivityService.$isCurrentWsPathStarred,
  );
  const noteActions = getSingleNoteActions({
    commandDispatcher: coreServices.commandDispatcher,
    source: 'AppHeader.NoteActions',
    wsPath: currentWsPath,
  });

  const handleStarClick = () => {
    coreServices.commandDispatcher.dispatch(
      'command::workspace:toggle-star',
      { wsPath: currentWsPath },
      'AppHeader.ToolbarRightSection',
    );
  };

  return (
    <div className="desktop-titlebar-no-drag flex shrink-0 items-center">
      <StarButton
        isStarred={isCurrentWsPathStarred}
        onClick={handleStarClick}
        className="ml-2"
        title={
          isCurrentWsPathStarred
            ? t.app.common.unstarItem
            : t.app.common.starItem
        }
      />
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
      {noteActions.length > 0 ? (
        <DropdownMenu.DropdownMenu>
          <DropdownMenu.DropdownMenuTrigger
            render={
              <Button
                aria-label={t.app.components.noteActions.menuLabel}
                className="ml-2 h-7 w-7"
                size="icon"
                title={t.app.components.noteActions.menuLabel}
                variant="ghost"
              >
                <EllipsisVertical aria-hidden="true" className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenu.DropdownMenuContent align="end" className="min-w-44">
            {noteActions.map(
              ({ Icon, id, label, run, separatorBefore, variant }) => (
                <React.Fragment key={id}>
                  {separatorBefore ? (
                    <DropdownMenu.DropdownMenuSeparator />
                  ) : null}
                  <DropdownMenu.DropdownMenuItem
                    onClick={run}
                    variant={variant}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{label}</span>
                  </DropdownMenu.DropdownMenuItem>
                </React.Fragment>
              ),
            )}
          </DropdownMenu.DropdownMenuContent>
        </DropdownMenu.DropdownMenu>
      ) : null}
    </div>
  );
}
