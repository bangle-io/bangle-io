import { OpenedWsPaths } from '@bangle.io/ws-path';

import { WorkspaceSliceState } from '../workspace-slice-state';

describe('workspace slice state', () => {
  test('case 1', () => {
    const state = new WorkspaceSliceState({
      wsName: undefined,
      openedWsPaths: OpenedWsPaths.createEmpty(),
      recentlyUsedWsPaths: undefined,
      wsPaths: undefined,
      refreshCounter: 0,
      workspacesInfo: undefined,
      error: undefined,
    });
    const newState = WorkspaceSliceState.update(state, {
      wsName: 'test-ws',
    });
    expect(newState.wsName).toEqual('test-ws');
  });

  test('updating openedWsPaths should preserve instance if same 1', () => {
    const orginal = OpenedWsPaths.createEmpty();
    const state = new WorkspaceSliceState({
      wsName: undefined,
      openedWsPaths: orginal,
      recentlyUsedWsPaths: undefined,
      wsPaths: undefined,
      refreshCounter: 0,
      workspacesInfo: undefined,
      error: undefined,
    });
    const newState = WorkspaceSliceState.update(state, {
      openedWsPaths: OpenedWsPaths.createEmpty(),
    });
    expect(newState.openedWsPaths).toBe(orginal);
  });

  test('updating openedWsPaths should preserve instance if same 2', () => {
    const orginal = OpenedWsPaths.createFromArray(['test-ws:one.md']);
    const state = new WorkspaceSliceState({
      wsName: undefined,
      openedWsPaths: orginal,
      recentlyUsedWsPaths: undefined,
      wsPaths: undefined,
      refreshCounter: 0,
      workspacesInfo: undefined,
      error: undefined,
    });
    const newState = WorkspaceSliceState.update(state, {
      openedWsPaths: OpenedWsPaths.createFromArray(['test-ws:one.md']),
    });
    expect(newState.openedWsPaths).toBe(orginal);
  });

  test('updating openedWsPaths works', () => {
    const orginal = OpenedWsPaths.createFromArray(['test-ws:one.md']);
    const state = new WorkspaceSliceState({
      wsName: undefined,
      openedWsPaths: orginal,
      recentlyUsedWsPaths: undefined,
      wsPaths: undefined,
      refreshCounter: 0,
      workspacesInfo: undefined,
      error: undefined,
    });
    const newState = WorkspaceSliceState.update(state, {
      openedWsPaths: OpenedWsPaths.createFromArray([
        'test-ws:one.md',
        'test-ws:two.md',
      ]),
    });
    expect(newState.openedWsPaths).not.toBe(orginal);

    expect(
      newState.openedWsPaths.equal(
        OpenedWsPaths.createFromArray(['test-ws:one.md', 'test-ws:two.md']),
      ),
    ).toBe(true);
  });
});
