import { createSelector } from 'reselect';

import type { WorkspaceInfo } from '@bangle.io/shared-types';
import type { OpenedWsPaths } from '@bangle.io/ws-path';
import { isValidNoteWsPath } from '@bangle.io/ws-path';

export type WorkspaceStateKeys = keyof ConstructorParameters<
  typeof WorkspaceSliceState
>[0];

export interface WorkspaceInfoReg {
  [wsName: string]: WorkspaceInfo;
}

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
      error: WorkspaceSliceState['error'];
      openedWsPaths: WorkspaceSliceState['openedWsPaths'];
      recentlyUsedWsPaths: WorkspaceSliceState['recentlyUsedWsPaths'];
      refreshCounter: WorkspaceSliceState['refreshCounter'];
      workspacesInfo: WorkspaceSliceState['workspacesInfo'];
      wsName: WorkspaceSliceState['wsName'];
      wsPaths: WorkspaceSliceState['wsPaths'];
    },
    protected opts: any = {},
  ) {}

  get error(): Error | undefined {
    return this.mainFields.error;
  }

  // derived
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

  get workspacesInfo(): WorkspaceInfoReg | undefined {
    return this.mainFields.workspacesInfo;
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
