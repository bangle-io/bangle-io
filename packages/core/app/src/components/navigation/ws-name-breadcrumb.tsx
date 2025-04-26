import { useCoreServices } from '@bangle.io/context';
import { Breadcrumb, Button, DropdownMenu } from '@bangle.io/ui-components';
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
        <Breadcrumb.BreadcrumbSeparator />
        <Breadcrumb.BreadcrumbItem>
          <DropdownMenu.DropdownMenu>
            <DropdownMenu.DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto cursor-pointer px-1 py-0 font-medium text-sm hover:underline"
              >
                {wsName}
              </Button>
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
                <span>{t.app.common.newWorkspace}</span>
              </DropdownMenu.DropdownMenuItem>
              {workspaces.length > 1 && (
                <>
                  <DropdownMenu.DropdownMenuSeparator />
                  {workspaces
                    .filter((workspace) => workspace.name !== wsName)
                    .map((workspace) => (
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
