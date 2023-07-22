import { nsmApi2 } from '@bangle.io/api';
import type { Severity } from '@bangle.io/constants';
import { SEVERITY, WorkspaceType } from '@bangle.io/constants';
import { acquireLockIfAvailable, isMobile } from '@bangle.io/utils';

export const EXTENSION_NAME = '@bangle.io/github-storage';

export const GITHUB_STORAGE_PROVIDER_NAME = WorkspaceType.Github;

export const OPERATION_UPDATE_GITHUB_TOKEN =
  'operation::@bangle.io/github-storage:update-github-token';

export const OPERATION_SYNC_GITHUB_CHANGES =
  'operation::@bangle.io/github-storage:sync-github-changes';

export const OPERATION_DISCARD_LOCAL_CHANGES =
  'operation::@bangle.io/github-storage:OPERATION_DISCARD_LOCAL_CHANGES';

export const OPERATION_SHOW_CONFLICT_DIALOG =
  'operation::@bangle.io/github-storage:show-conflict-dialog';

export const OPERATION_OPTIMIZE_GITHUB_STORAGE =
  'operation::@bangle.io/github-storage:OPERATION_OPTIMIZE_GITHUB_STORAGE';

export const DISCARD_LOCAL_CHANGES_DIALOG =
  'dialog::@bangle.io/github-storage:discard-local-changes';

export const NEW_GITHUB_WORKSPACE_TOKEN_DIALOG =
  'dialog::@bangle.io/github-storage:NEW_GITHUB_WORKSPACE_TOKEN_DIALOG';

export const NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG =
  'dialog::@bangle.io/github-storage:NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG';

export const UPDATE_GITHUB_TOKEN_DIALOG =
  'dialog::@bangle.io/github-storage:UPDATE_GITHUB_TOKEN_DIALOG';

export const CONFLICT_DIALOG = 'dialog::@bangle.io/github-storage:conflict';

export const LOCK_NAME = '@bangle.io/github-storage:sync-lock';

export interface GithubWsMetadata {
  owner: string;
  branch: string;
}

export async function getGithubSyncLockWrapper<
  R extends (...args: any[]) => Promise<any>,
>(
  wsName: string,
  cb: R,
): Promise<
  | {
      lockAcquired: true;
      result: Awaited<ReturnType<R>>;
    }
  | {
      lockAcquired: false;
      result: undefined;
    }
> {
  let releaseLock = await acquireLockIfAvailable(LOCK_NAME + ':' + wsName);

  if (!releaseLock) {
    return { lockAcquired: false, result: undefined };
  }

  try {
    let result = await cb();

    return {
      lockAcquired: true,
      result,
    };
  } finally {
    await releaseLock();
  }
}

export const getSyncInterval = () => (isMobile ? 15 * 1000 : 1000 * 60);

export function notify(title: string, severity: Severity, content?: string) {
  return nsmApi2.ui.showNotification({
    severity,
    title,
    uid: 'sync notification-' + Math.random(),
    transient: severity !== SEVERITY.ERROR,
    content,
  });
}
