import { assertIsDefined } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { testCommandHandler } from '@bangle.io/test-utils';
import { WsPath } from '@bangle.io/ws-path';
import { expect, vi } from 'vitest';
import { commandHandlers as defaultCommandHandlers } from '../index';

export async function setupTest({
  targetId,
  workspaces,
  autoNavigate = 'workspace',
}: {
  targetId: string;
  workspaces?: Array<{
    name: string;
    notes?: string[];
  }>;
  autoNavigate?: 'workspace' | 'ws-path' | false;
}): Promise<{
  dispatch: ReturnType<typeof testCommandHandler>['dispatch'];
  testEnv: ReturnType<typeof testCommandHandler>['testEnv'];
  services: Awaited<
    ReturnType<ReturnType<typeof testCommandHandler>['autoMountServices']>
  >;
  getCommandResults: ReturnType<typeof testCommandHandler>['getCommandResults'];
}> {
  const target = defaultCommandHandlers.find((c) => c.id === targetId);
  assertIsDefined(target);
  const { dispatch, testEnv, autoMountServices, getCommandResults } =
    testCommandHandler({
      target,
    });
  const services = await autoMountServices();
  if (workspaces) {
    for (const workspace of workspaces) {
      await services.workspaceOps.createWorkspaceInfo({
        name: workspace.name,
        type: WORKSPACE_STORAGE_TYPE.Memory,
        metadata: {},
      });
      if (workspace.notes) {
        for (const wsPath of workspace.notes) {
          const fileNameWithoutExt =
            WsPath.fromString(wsPath).asFile()?.fileNameWithoutExtension ||
            'unknown';
          await services.fileSystem.createFile(
            wsPath,
            new File(
              [`I am content of ${fileNameWithoutExt}`],
              fileNameWithoutExt,
              {
                type: 'text/plain',
              },
            ),
          );
        }
      }
    }
    if (autoNavigate === 'workspace') {
      const workspace = workspaces.at(-1);
      assertIsDefined(workspace);
      services.navigation.goWorkspace(workspace.name);
      await vi.waitFor(() => {
        expect(services.workspaceState.resolveAtoms().currentWsName).toBe(
          workspace.name,
        );
      });
    }
    if (autoNavigate === 'ws-path') {
      const workspace = workspaces.at(-1);
      assertIsDefined(workspace);
      const wsPath = workspace.notes?.at(-1);
      assertIsDefined(wsPath);
      services.navigation.goWsPath(wsPath);
      await vi.waitFor(() => {
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(wsPath);
        expect(
          services.workspaceState.resolveAtoms().wsPaths.length,
        ).toBeGreaterThan(0);
      });
    }
  }
  return { dispatch, testEnv, services, getCommandResults };
}
