import { createSelector } from 'reselect';
import type { Simplify } from 'type-fest';

import { isValidNoteWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

import {
  getPrimaryWsPath,
  getSecondaryWsPath,
  getWsNameFromPathname,
} from './helpers';

export const UpdateState = Symbol('workspace-state');

export type WorkspaceStateKeys = keyof ConstructorParameters<
  typeof WorkspaceSliceStateConstructor
>[0];

// This exists because we want to treat the instance of
// WorkspaceSliceStateConstructor as a simple object
// and typescript revolts if we directly use the class type.
export type WorkspaceSliceState = Simplify<
  Omit<WorkspaceSliceStateConstructor, typeof UpdateState>
>;

export class WorkspaceSliceStateConstructor {
  constructor(
    private mainFields: {
      wsPaths: WorkspaceSliceStateConstructor['wsPaths'];
      recentlyUsedWsPaths: WorkspaceSliceStateConstructor['recentlyUsedWsPaths'];
      locationPathname: WorkspaceSliceStateConstructor['locationPathname'];
      locationSearchQuery: WorkspaceSliceStateConstructor['locationSearchQuery'];
    },
    private opts: any = {},
  ) {}

  [UpdateState](
    obj: Partial<
      ConstructorParameters<typeof WorkspaceSliceStateConstructor>[0]
    >,
  ): WorkspaceSliceStateConstructor {
    return new WorkspaceSliceStateConstructor(
      Object.assign({}, this.mainFields, obj),
      this.opts,
    );
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

const selectPathname = (state: WorkspaceSliceStateConstructor) =>
  state.locationPathname;
const selectSearchQuery = (state: WorkspaceSliceStateConstructor) =>
  state.locationSearchQuery;

const selectNoteWsPaths = createSelector(
  (state: WorkspaceSliceStateConstructor) => state.wsPaths,
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
