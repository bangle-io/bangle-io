import { createSelector } from 'reselect';

import { isValidNoteWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

import {
  getPrimaryWsPath,
  getSecondaryWsPath,
  getWsNameFromPathname,
} from './helpers';

export const UpdateState = Symbol('workspace-state');

export type WorkspaceStateKeys = keyof ConstructorParameters<
  typeof WorkspaceSliceState
>[0];

export class WorkspaceSliceState {
  constructor(
    private mainFields: {
      wsPaths: WorkspaceSliceState['wsPaths'];
      recentlyUsedWsPaths: WorkspaceSliceState['recentlyUsedWsPaths'];
      locationPathname: WorkspaceSliceState['locationPathname'];
      locationSearchQuery: WorkspaceSliceState['locationSearchQuery'];
    },
    private opts: any = {},
  ) {}

  [UpdateState](
    obj: Partial<ConstructorParameters<typeof WorkspaceSliceState>[0]>,
  ): WorkspaceSliceState {
    return new WorkspaceSliceState(
      Object.assign({}, this.mainFields, obj),
      this.opts,
    );
  }

  // mainFields
  get wsPaths(): string[] | undefined {
    return this.mainFields.wsPaths;
  }
  get recentlyUsedWsPaths(): string[] | undefined {
    return this.mainFields.recentlyUsedWsPaths || [];
  }
  get locationPathname(): string | undefined {
    return this.mainFields.locationPathname;
  }
  get locationSearchQuery(): string | undefined {
    return this.mainFields.locationSearchQuery;
  }

  // derived
  get noteWsPaths(): string[] | undefined {
    return selectNoteWsPaths(this);
  }
  get wsName(): string | undefined {
    return selectWsName(this);
  }
  get openedWsPaths(): OpenedWsPaths {
    return selectOpenedWsPaths(this);
  }
}

const selectPathname = (state: WorkspaceSliceState) => state.locationPathname;
const selectSearchQuery = (state: WorkspaceSliceState) =>
  state.locationSearchQuery;

const selectNoteWsPaths = createSelector(
  (state: WorkspaceSliceState) => state.wsPaths,
  (wsPaths) => {
    return wsPaths?.filter((wsPath) => isValidNoteWsPath(wsPath));
  },
);

const selectWsName = createSelector(selectPathname, (pathName) => {
  return getWsNameFromPathname(pathName);
});

const selectOpenedWsPaths = createSelector(
  [selectPathname, selectSearchQuery],
  (pathName, searchQuery) => {
    return OpenedWsPaths.createFromArray([
      getPrimaryWsPath(pathName),
      getSecondaryWsPath(searchQuery),
    ]);
  },
);
