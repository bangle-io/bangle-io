import { cx } from '@bangle.io/base-utils';
import { useCoreServices, useLogger } from '@bangle.io/context';
import type { Logger } from '@bangle.io/logger';
import type { CoreServices, WorkspaceInfo } from '@bangle.io/types';
import { Button } from '@bangle.io/ui-components';
import bangleIcon from '@bangle.io/ui-components/src/bangle-transparent_x512.png';
import {
  buildURL,
  buildUrlPath,
  getWsName,
  resolvePath,
  validateWsPath,
} from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import React from 'react';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

type RecentPathInfo = {
  wsPath: string;
  timestamp: number;
};

type ProcessedPathInfo = {
  wsPath: string;
  wsName: string;
  href: string;
  displayName: string;
  isFirstInWorkspace: boolean;
};

const MIN_WORKSPACES_TO_SHOW = 2;

/**
 * Process recent paths to select which to display.
 * Returns all necessary information for rendering.
 */
export async function processRecentPaths(
  recentPathsWithTimestamp: RecentPathInfo[],
  workspaceOps: CoreServices['workspaceOps'],
  logger: Logger,
): Promise<ProcessedPathInfo[]> {
  if (recentPathsWithTimestamp.length === 0) {
    let workspaces: WorkspaceInfo[] = [];
    try {
      workspaces = await workspaceOps.getAllWorkspaces();
    } catch (err) {
      logger.error('Failed to fetch workspaces:', err);
      return [];
    }
    return workspaces.slice(0, MIN_WORKSPACES_TO_SHOW).map((ws) => ({
      wsPath: ws.name,
      wsName: ws.name,
      href: buildURL(buildUrlPath.pageWsHome({ wsName: ws.name })),
      displayName: 'Workspace Home',
      isFirstInWorkspace: true,
    }));
  }

  // First sort all paths by timestamp (most recent first)
  const sortedPaths = recentPathsWithTimestamp
    .filter((item) => validateWsPath(item.wsPath).isValid)
    .sort((a, b) => b.timestamp - a.timestamp);

  const result: ProcessedPathInfo[] = [];
  const seenWorkspaces = new Set<string>();

  // Process paths in chronological order
  for (const path of sortedPaths) {
    const wsName = getWsName(path.wsPath);
    if (!wsName) continue;

    const isWorkspaceHome = path.wsPath === wsName;
    const href = isWorkspaceHome
      ? buildURL(buildUrlPath.pageWsHome({ wsName }))
      : buildURL(buildUrlPath.pageEditor({ wsPath: path.wsPath }));

    const displayName = isWorkspaceHome
      ? 'Workspace Home'
      : resolvePath(path.wsPath)?.fileName || path.wsPath;

    result.push({
      wsPath: path.wsPath,
      wsName,
      href,
      displayName,
      isFirstInWorkspace: !seenWorkspaces.has(wsName),
    });

    seenWorkspaces.add(wsName);
  }

  return result;
}

export function PageWelcome() {
  const coreServices = useCoreServices();
  const { commandDispatcher, userActivityService, workspaceOps } = coreServices;
  const logger = useLogger();

  const recentPathsWithTimestamp = useAtomValue(
    userActivityService.$allRecentWsPaths,
  );

  const [processedPaths, setProcessedPaths] = React.useState<
    ProcessedPathInfo[]
  >([]);

  React.useEffect(() => {
    const abortController = new AbortController();

    (async () => {
      const paths = await processRecentPaths(
        recentPathsWithTimestamp,
        workspaceOps,
        logger,
      );

      if (abortController.signal.aborted) return;
      setProcessedPaths(paths);
    })();

    return () => {
      abortController.abort();
    };
  }, [recentPathsWithTimestamp, workspaceOps, logger]);

  const showNoRecentNotes = processedPaths.length === 0;

  return (
    <>
      <PageHeaderWrapper>
        <h1 className="font-medium text-lg">Welcome to Bangle.io</h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <div className="mt-12 flex flex-col items-center justify-center gap-4 text-center">
          <a
            href="https://bangle.io"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-60"
          >
            <img
              src={bangleIcon}
              alt="Bangle logo"
              className="h-28 w-28 opacity-40 grayscale"
            />
          </a>
          <h2 className="font-semibold text-xl">Welcome back!</h2>
          {showNoRecentNotes && (
            <div className="text-muted-foreground text-sm">
              No recent notes. Create or open a workspace to get started.
            </div>
          )}
          {!showNoRecentNotes && processedPaths.length > 0 && (
            <div className="flex flex-col items-center gap-3">
              <h3 className="font-medium text-lg">Recent:</h3>
              <ul className="grid w-full max-w-[600px] gap-2 px-4">
                {processedPaths.map((item) => (
                  <li key={item.wsPath}>
                    <a
                      href={item.href}
                      className={cx(
                        'block select-none rounded-md p-2 leading-none',
                        'no-underline outline-none transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus:bg-accent focus:text-accent-foreground',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-primary text-sm">
                          {item.displayName}
                        </span>
                        <span
                          className={cx(
                            'text-xs',
                            item.isFirstInWorkspace
                              ? 'font-medium text-primary'
                              : 'text-muted-foreground',
                          )}
                        >
                          {item.wsName}
                        </span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button
              onClick={() =>
                commandDispatcher.dispatch(
                  'command::ui:create-workspace-dialog',
                  null,
                  'ui',
                )
              }
              variant="default"
            >
              Create New Workspace
            </Button>
            <Button
              onClick={() =>
                commandDispatcher.dispatch(
                  'command::ui:switch-workspace',
                  null,
                  'ui',
                )
              }
              variant="outline"
            >
              Open Existing Workspace
            </Button>
          </div>
        </div>
      </PageMainContentWrapper>
    </>
  );
}
