import { createSelector } from 'reselect';

import { isValidNoteWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

export type WorkspaceStateKeys = keyof ConstructorParameters<
  typeof WorkspaceSliceState
>[0];

export class WorkspaceSliceState {
  constructor(
    protected mainFields: {
      wsPaths: WorkspaceSliceState['wsPaths'];
      recentlyUsedWsPaths: WorkspaceSliceState['recentlyUsedWsPaths'];
      wsName: WorkspaceSliceState['wsName'];
      openedWsPaths: WorkspaceSliceState['openedWsPaths'];
    },
    protected opts: any = {},
  ) {}

  static update(
    existing: WorkspaceSliceState,
    obj: Partial<ConstructorParameters<typeof WorkspaceSliceState>[0]>,
  ) {
    return new WorkspaceSliceState(Object.assign({}, existing.mainFields, obj));
  }

  // mainFields
  get wsPaths(): string[] | undefined {
    return this.mainFields.wsPaths;
  }
  get recentlyUsedWsPaths(): string[] | undefined {
    return this.mainFields.recentlyUsedWsPaths;
  }
  get wsName(): string | undefined {
    return this.mainFields.wsName;
  }
  get openedWsPaths(): OpenedWsPaths {
    return this.mainFields.openedWsPaths;
  }

  // derived
  get noteWsPaths(): string[] | undefined {
    return selectNoteWsPaths(this);
  }
}

const selectNoteWsPaths = createSelector(
  (state: WorkspaceSliceState) => state.wsPaths,
  (wsPaths) => {
    return wsPaths?.filter((wsPath) => isValidNoteWsPath(wsPath));
  },
);
