import { createSelector } from 'reselect';

import { isValidNoteWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

import {
  getPrimaryWsPath,
  getSecondaryWsPath,
  getWsNameFromPathname,
  validateOpenedWsPaths,
} from './helpers';

export type WorkspaceStateKeys = keyof ConstructorParameters<
  typeof WorkspaceSliceState
>[0];

export class WorkspaceSliceState {
  constructor(
    protected mainFields: {
      wsPaths: WorkspaceSliceState['wsPaths'];
      recentlyUsedWsPaths: WorkspaceSliceState['recentlyUsedWsPaths'];
      locationPathname: WorkspaceSliceState['locationPathname'];
      locationSearchQuery: WorkspaceSliceState['locationSearchQuery'];
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

export const selectWsName = createSelector(selectPathname, (pathName) => {
  const wsName = getWsNameFromPathname(pathName);
  return wsName;
});

const selectOpenedWsPaths = createSelector(
  [selectPathname, selectSearchQuery],
  (pathName, searchQuery) => {
    const openedWsPaths = OpenedWsPaths.createFromArray([
      getPrimaryWsPath(pathName),
      getSecondaryWsPath(searchQuery),
    ]);

    if (validateOpenedWsPaths(openedWsPaths).valid) {
      return openedWsPaths;
    }
    return OpenedWsPaths.createEmpty();
  },
);
