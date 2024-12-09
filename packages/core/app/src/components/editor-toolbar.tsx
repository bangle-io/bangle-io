import { checkWidescreen, cx } from '@bangle.io/base-utils';
import { useCoreServices } from '@bangle.io/context';
import { Button, Separator, Sidebar } from '@bangle.io/ui-components';
import {
  getParentWsPath,
  pathJoin,
  resolveDirWsPath,
} from '@bangle.io/ws-path';
import { PATH_SEPARATOR } from '@bangle.io/ws-path';
import { useAtom, useAtomValue } from 'jotai';
import { ChevronsRightLeft, MoveHorizontal } from 'lucide-react';
import React from 'react';
import { NoteBreadcrumb } from './note-breadcrumb';

const isWideEditor = checkWidescreen();
export function EditorToolbar() {
  const coreServices = useCoreServices();
  const wsPath = useAtomValue(coreServices.navigation.$wsPath);
  const wsPaths = useAtomValue(coreServices.workspaceState.$wsPaths);
  const [wideEditor, setWideEditor] = useAtom(
    coreServices.workbenchState.$wideEditor,
  );

  return (
    <header
      className={cx('h-16 w-full', !wideEditor && 'max-w-screen-md pr-8')}
    >
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sidebar.SidebarTrigger className="-ml-1" />
          {wsPath && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <NoteBreadcrumb
                wsPath={wsPath}
                wsPaths={wsPaths}
                onNewNote={({ wsPath }) => {
                  const parent = getParentWsPath(wsPath);
                  let path = parent && resolveDirWsPath(parent)?.dirPath;
                  if (path) {
                    path += PATH_SEPARATOR;
                  }
                  coreServices.commandDispatcher.dispatch(
                    'command::ui:create-note-dialog',
                    {
                      prefillName: path || '',
                    },
                    'EditorToolbar',
                  );
                }}
              />
            </>
          )}
        </div>
        <div className="flex items-center">
          {isWideEditor && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 h-7 w-7"
              onClick={() => setWideEditor((prev) => !prev)}
            >
              {wideEditor ? <ChevronsRightLeft /> : <MoveHorizontal />}
              <span className="sr-only">Toggle Max Width</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
