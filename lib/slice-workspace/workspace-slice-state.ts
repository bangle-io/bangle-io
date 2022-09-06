import { createSelector } from 'reselect';

import type { WorkspaceInfo } from '@bangle.io/shared-types';
import type { OpenedWsPaths } from '@bangle.io/ws-path';
import { isValidNoteWsPath } from '@bangle.io/ws-path';

import type { StorageProviderErrorInfo } from './common';

export type WorkspaceStateKeys = keyof ConstructorParameters<
  typeof WorkspaceSliceState
>[0];

export class WorkspaceSliceState {
  static update(
    existing: WorkspaceSliceState,
    obj: Partial<ConstructorParameters<typeof WorkspaceSliceState>[0]>,
  ) {
    // retain instance if possible
    if (obj.openedWsPaths) {
      obj.openedWsPaths = existing.openedWsPaths.update(obj.openedWsPaths);
    }

    return new WorkspaceSliceState(Object.assign({}, existing.mainFields, obj));
  }

  constructor(
    protected mainFields: {
      cachedWorkspaceInfo: WorkspaceInfo | undefined;
      openedWsPaths: WorkspaceSliceState['openedWsPaths'];
      recentlyUsedWsPaths: WorkspaceSliceState['recentlyUsedWsPaths'];
      refreshCounter: WorkspaceSliceState['refreshCounter'];
      storageProviderErrors: WorkspaceSliceState['storageProviderErrors'];
      wsName: WorkspaceSliceState['wsName'];
      wsPaths: WorkspaceSliceState['wsPaths'];
    },
    protected opts: any = {},
  ) {}

  get cachedWorkspaceInfo() {
    return this.mainFields.cachedWorkspaceInfo;
  }

  get noteWsPaths(): string[] | undefined {
    return selectNoteWsPaths(this);
  }

  get openedWsPaths(): OpenedWsPaths {
    return this.mainFields.openedWsPaths;
  }

  get recentlyUsedWsPaths(): string[] | undefined {
    return this.mainFields.recentlyUsedWsPaths;
  }

  // returns the current wsName refreshing for
  get refreshCounter(): number {
    return this.mainFields.refreshCounter;
  }

  get storageProviderErrors(): StorageProviderErrorInfo[] {
    return this.mainFields.storageProviderErrors;
  }

  get wsName(): string | undefined {
    return this.mainFields.wsName;
  }

  // mainFields
  get wsPaths(): string[] | undefined {
    return this.mainFields.wsPaths;
  }
}

const selectNoteWsPaths = createSelector(
  (state: WorkspaceSliceState) => state.wsPaths,
  (wsPaths) => {
    return wsPaths?.filter((wsPath) => isValidNoteWsPath(wsPath));
  },
);
