import type { WorkspaceInfo } from '@bangle.io/shared-types';
import type { BaseStorageProvider } from '@bangle.io/storage';
import { BaseError } from '@bangle.io/utils';

export enum WorkspaceErrorCode {
  WORKSPACE_NOT_FOUND_ERROR = 'WORKSPACE_NOT_FOUND_ERROR',
  NOTE_FORMAT_PROVIDER_NOT_FOUND_ERROR = 'NOTE_FORMAT_PROVIDER_NOT_FOUND_ERROR',
  WORKSPACE_ALREADY_EXISTS_ERROR = 'WORKSPACE_ALREADY_EXISTS_ERROR',
  WORKSPACE_STORAGE_PROVIDER_DOES_NOT_EXIST_ERROR = 'WORKSPACE_STORAGE_PROVIDER_DOES_NOT_EXIST_ERROR',
}

export class WorkspaceError extends BaseError {
  static assertStorageProviderDefined(
    storageProvider: BaseStorageProvider | undefined,
    wsInfoType: string,
  ): asserts storageProvider is BaseStorageProvider {
    if (!storageProvider) {
      throw new WorkspaceError({
        message: `Storage provider "${wsInfoType}" does not exist.`,
        code: WorkspaceErrorCode.WORKSPACE_STORAGE_PROVIDER_DOES_NOT_EXIST_ERROR,
      });
    }
  }

  static assertWsInfoDefined(
    wsName: string,
    workspaceInfo: WorkspaceInfo | undefined,
  ): asserts workspaceInfo is WorkspaceInfo {
    if (!workspaceInfo) {
      throw new WorkspaceError({
        message: `Workspace ${wsName} not found`,
        code: WorkspaceErrorCode.WORKSPACE_NOT_FOUND_ERROR,
      });
    }
  }

  code: WorkspaceErrorCode;

  constructor(
    obj: ConstructorParameters<typeof BaseError>[0] & {
      code: WorkspaceErrorCode;
    },
  ) {
    super(obj);
    this.code = obj.code;
  }
}
