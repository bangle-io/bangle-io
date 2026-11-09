import { throwAppError } from '@bangle.io/base-utils';
import { WsPath } from '@bangle.io/ws-path';

export function assertSameWorkspaceRename(
  oldWsPath: string,
  newWsPath: string,
): void {
  const oldPath = WsPath.assertFile(oldWsPath);
  const newPath = WsPath.assertFile(newWsPath);

  if (oldPath.wsName !== newPath.wsName) {
    throwAppError(
      'error::file:invalid-operation',
      'Cannot rename file across different workspaces',
      {
        operation: 'rename',
        oldWsPath,
        newWsPath,
      },
    );
  }
}
