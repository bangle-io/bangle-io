import { AppState } from '@bangle.io/create-store';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { workspaceContextKey, workspaceContextSlice } from '..';

describe('serialization works', () => {
  test('serialization works', () => {
    let state = AppState.create({ slices: [workspaceContextSlice()] });

    expect(
      state.stateToJSON({
        sliceFields: { workspace: workspaceContextSlice() },
      }),
    ).toMatchInlineSnapshot(`
      Object {
        "workspace": Object {
          "locationPathname": "/",
          "locationSearchQuery": "",
          "openedWsPaths": Array [
            null,
            null,
          ],
          "wsName": undefined,
        },
      }
    `);
  });

  test('parsing works 1', () => {
    let state = AppState.stateFromJSON({
      slices: [workspaceContextSlice()],
      json: {
        workspace: { locationPathname: '/test', locationSearchQuery: 'query' },
      },
      sliceFields: { workspace: workspaceContextSlice() },
    });

    expect(workspaceContextKey.getSliceState(state)).toMatchInlineSnapshot(`
      Object {
        "locationPathname": "/test",
        "locationSearchQuery": "query",
        "openedWsPaths": OpenedWsPaths {
          "wsPaths": Array [
            undefined,
            undefined,
          ],
        },
        "wsName": undefined,
      }
    `);

    expect(
      state.stateToJSON({
        sliceFields: { workspace: workspaceContextSlice() },
      }),
    ).toMatchInlineSnapshot(`
      Object {
        "workspace": Object {
          "locationPathname": "/test",
          "locationSearchQuery": "query",
          "openedWsPaths": Array [
            null,
            null,
          ],
          "wsName": undefined,
        },
      }
    `);
  });

  test('parsing openedWsPaths', () => {
    let state = AppState.stateFromJSON({
      slices: [workspaceContextSlice()],
      json: {
        workspace: { openedWsPaths: [null, 'test:one.md'] },
      },
      sliceFields: { workspace: workspaceContextSlice() },
    });

    expect(
      workspaceContextKey
        .getSliceState(state)
        ?.openedWsPaths.equal(
          OpenedWsPaths.createFromArray([null, 'test:one.md']),
        ),
    ).toBe(true);

    expect(
      state.stateToJSON({
        sliceFields: { workspace: workspaceContextSlice() },
      }),
    ).toMatchInlineSnapshot(`
      Object {
        "workspace": Object {
          "locationPathname": "/",
          "locationSearchQuery": "",
          "openedWsPaths": Array [
            null,
            "test:one.md",
          ],
          "wsName": undefined,
        },
      }
    `);
  });

  test('parsing wsName', () => {
    let state = AppState.stateFromJSON({
      slices: [workspaceContextSlice()],
      json: {
        workspace: { wsName: 'test' },
      },
      sliceFields: { workspace: workspaceContextSlice() },
    });

    expect(workspaceContextKey.getSliceState(state)?.wsName).toBe('test');
  });
});

describe('state', () => {
  const createState = (initialJsonState: any = {}) => {
    return AppState.stateFromJSON({
      slices: [workspaceContextSlice()],
      json: {
        workspace: initialJsonState,
      },
      sliceFields: { workspace: workspaceContextSlice() },
    });
  };

  test('updates location', () => {
    let state = createState({ wsName: 'abcd' });

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: 'test-path',
        locationSearchQuery: 'test-query',
      },
    });

    expect(workspaceContextKey.getSliceState(state)?.locationPathname).toBe(
      'test-path',
    );
    expect(workspaceContextKey.getSliceState(state)?.locationSearchQuery).toBe(
      'test-query',
    );
  });

  test('updating location changes wsName', () => {
    let state = createState({ wsName: 'abcd' });

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: '/ws/test-path/k.md',
        locationSearchQuery: 'test-query',
      },
    });

    expect(workspaceContextKey.getSliceState(state)?.wsName).toBe('test-path');
    expect(
      workspaceContextKey.getSliceState(state)?.openedWsPaths.toArray(),
    ).toEqual(['test-path:k.md', null]);
  });

  test('wsPath', () => {
    let state = createState({ wsName: 'abcd' });

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: '',
        locationSearchQuery: 'secondary=bangle-help%3Agetting+started.md',
      },
    });

    expect(
      workspaceContextKey.getSliceState(state)?.openedWsPaths.getByIndex(0),
    ).toBe(undefined);

    expect(
      workspaceContextKey.getSliceState(state)?.openedWsPaths.getByIndex(1),
    ).toBe('bangle-help:getting started.md');
  });

  test('should preserve openedWsPath', () => {
    let state = createState({ wsName: 'abcd' });

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: '/ws/test-path/k.md',
        locationSearchQuery: 'test-query',
      },
    });

    let state2 = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: '/ws/test-path/k.md',
        locationSearchQuery: 'test-query',
      },
    });

    expect(workspaceContextKey.getSliceState(state)?.openedWsPaths).toBe(
      workspaceContextKey.getSliceState(state2)?.openedWsPaths,
    );
  });

  test('dispatching other action should not affect existing state', () => {
    let state = createState({ wsName: 'abcd' });

    state = state.applyAction({
      name: 'action::some-other-action',
    } as any);
    expect(workspaceContextKey.getSliceState(state)?.wsName).toBe('abcd');
  });
});
