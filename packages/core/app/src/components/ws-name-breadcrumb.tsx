import { useCoreServices } from '@bangle.io/context';
import { Breadcrumb, DropdownMenu } from '@bangle.io/ui-components';
import { buildURL, buildUrlPath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import { Home, PlusIcon } from 'lucide-react';
import React from 'react';

interface WsNameBreadcrumbProps {
  wsName: string;
}

export function WsNameBreadcrumb({ wsName }: WsNameBreadcrumbProps) {
  const coreServices = useCoreServices();
  const workspaces = useAtomValue(coreServices.workspaceState.$workspaces);

  return (
    <Breadcrumb.Breadcrumb>
      <Breadcrumb.BreadcrumbList>
        <Breadcrumb.BreadcrumbItem>
          <Breadcrumb.BreadcrumbLink
            href={buildURL(buildUrlPath.pageWelcome())}
            title="Home"
          >
            <Home size={16} />
          </Breadcrumb.BreadcrumbLink>
        </Breadcrumb.BreadcrumbItem>
        <Breadcrumb.BreadcrumbSeparator />
        <Breadcrumb.BreadcrumbItem>
          <DropdownMenu.DropdownMenu>
            <DropdownMenu.DropdownMenuTrigger className="cursor-pointer hover:underline">
              {wsName}
            </DropdownMenu.DropdownMenuTrigger>
            <DropdownMenu.DropdownMenuContent align="start">
              <DropdownMenu.DropdownMenuItem
                onClick={() => {
                  coreServices.commandDispatcher.dispatch(
                    'command::ui:create-workspace-dialog',
                    null,
                    'WsNameBreadcrumb',
                  );
                }}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                <span>New Workspace</span>
              </DropdownMenu.DropdownMenuItem>
              {workspaces.length > 0 && (
                <>
                  <DropdownMenu.DropdownMenuSeparator />
                  {workspaces.map((workspace) => (
                    <DropdownMenu.DropdownMenuItem
                      key={workspace.name}
                      onClick={() => {
                        coreServices.navigation.goWorkspace(workspace.name);
                      }}
                    >
                      {workspace.name}
                    </DropdownMenu.DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenu.DropdownMenuContent>
          </DropdownMenu.DropdownMenu>
        </Breadcrumb.BreadcrumbItem>
      </Breadcrumb.BreadcrumbList>
    </Breadcrumb.Breadcrumb>
  );
}
