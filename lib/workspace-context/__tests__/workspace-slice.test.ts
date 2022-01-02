import { AppState } from '@bangle.io/create-store';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { workspaceSliceKey } from '../common';
import { JSON_SCHEMA_VERSION, workspaceSlice } from '../workspace-slice';
import { createState, createStateWithWsName } from './test-utils';

describe('serialization works', () => {
  test('serialization works', () => {
    let state = AppState.create({ slices: [workspaceSlice()] });

    expect(
      state.stateToJSON({
        sliceFields: { workspace: workspaceSlice() },
      }),
    ).toMatchInlineSnapshot(`
      Object {
        "workspace": Object {
          "data": Object {
            "openedWsPaths": Array [
              null,
              null,
            ],
            "pendingRefreshWsPaths": null,
            "recentlyUsedWsPaths": null,
            "wsName": null,
            "wsPaths": null,
          },
          "version": "workspace-slice/2",
        },
      }
    `);
  });

  test("doesn't parse incorrect schema", () => {
    let state = AppState.stateFromJSON({
      slices: [workspaceSlice()],
      json: {
        workspace: {
          version: 'wrong-version',
          data: { locationPathname: '/test-123' },
        },
      },
      sliceFields: { workspace: workspaceSlice() },
    });

    expect(workspaceSliceKey.getSliceState(state)).toMatchInlineSnapshot(`
      WorkspaceSliceState {
        "mainFields": Object {
          "openedWsPaths": OpenedWsPaths {
            "wsPaths": Array [
              undefined,
              undefined,
            ],
          },
          "pendingRefreshWsPaths": undefined,
          "recentlyUsedWsPaths": undefined,
          "wsName": undefined,
          "wsPaths": undefined,
        },
        "opts": Object {},
      }
    `);
  });

  test('parsing wsPaths', () => {
    let state = AppState.stateFromJSON({
      slices: [workspaceSlice()],
      json: {
        workspace: {
          version: JSON_SCHEMA_VERSION,
          data: { wsPaths: ['test:one.md', 'test:from.md'] },
        },
      },
      sliceFields: { workspace: workspaceSlice() },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toEqual([
      'test:one.md',
      'test:from.md',
    ]);

    expect(workspaceSliceKey.getSliceState(state)).toMatchInlineSnapshot(`
      WorkspaceSliceState {
        "mainFields": Object {
          "openedWsPaths": OpenedWsPaths {
            "wsPaths": Array [
              undefined,
              undefined,
            ],
          },
          "pendingRefreshWsPaths": undefined,
          "recentlyUsedWsPaths": undefined,
          "wsName": undefined,
          "wsPaths": Array [
            "test:one.md",
            "test:from.md",
          ],
        },
        "opts": Object {},
      }
    `);

    expect(
      state.stateToJSON({
        sliceFields: { workspace: workspaceSlice() },
      }),
    ).toMatchInlineSnapshot(`
      Object {
        "workspace": Object {
          "data": Object {
            "openedWsPaths": Array [
              null,
              null,
            ],
            "pendingRefreshWsPaths": null,
            "recentlyUsedWsPaths": null,
            "wsName": null,
            "wsPaths": Array [
              "test:one.md",
              "test:from.md",
            ],
          },
          "version": "workspace-slice/2",
        },
      }
    `);
  });

  test('parsing recentlyUsedWsPaths', () => {
    let state = AppState.stateFromJSON({
      slices: [workspaceSlice()],
      json: {
        workspace: {
          version: JSON_SCHEMA_VERSION,
          data: {
            wsName: 'bangle-help',
            openedWsPaths: [
              'bangle-help:test-path/k.md',
              'bangle-help:getting started.md',
            ],
          },
        },
      },
      sliceFields: { workspace: workspaceSlice() },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsName).toBe('bangle-help');

    expect(
      workspaceSliceKey
        .getSliceState(state)
        ?.openedWsPaths.equal(
          OpenedWsPaths.createFromArray([
            'bangle-help:test-path/k.md',
            'bangle-help:getting started.md',
          ]),
        ),
    ).toBe(true);

    expect(
      state.stateToJSON({
        sliceFields: { workspace: workspaceSlice() },
      }),
    ).toEqual({
      workspace: {
        data: {
          openedWsPaths: [
            'bangle-help:test-path/k.md',
            'bangle-help:getting started.md',
          ],
          recentlyUsedWsPaths: null,
          wsName: 'bangle-help',
          wsPaths: null,
          pendingRefreshWsPaths: null,
        },
        version: 'workspace-slice/2',
      },
    });
  });
});

describe('state', () => {
  test('updates location', () => {
    let state = createState();

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        wsName: 'test-path',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsName).toBe('test-path');
    expect(
      workspaceSliceKey.getSliceState(state)?.openedWsPaths.toArray(),
    ).toEqual(OpenedWsPaths.createEmpty().toArray());
  });

  test('change of location does not reset wsPath', () => {
    const wsPaths = ['test-ws:hello-world'];
    let state = createState({
      wsName: 'test-ws',
      wsPaths: wsPaths,
      recentlyUsedWsPaths: wsPaths,
    });

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toEqual(wsPaths);

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        openedWsPaths: OpenedWsPaths.createFromArray(['test-ws:some-path.md']),
        wsName: 'test-ws',
      },
    });

    expect(
      workspaceSliceKey.getSliceState(state)?.openedWsPaths.primaryWsPath,
    ).toEqual('test-ws:some-path.md');
    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toEqual(wsPaths);
    expect(workspaceSliceKey.getSliceState(state)?.recentlyUsedWsPaths).toEqual(
      wsPaths,
    );
  });

  test('wsName change resets wsPath and recentlyUsedWsPaths', () => {
    let state = createState({ wsPaths: [], recentlyUsedWsPaths: [] });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toEqual([]);
    expect(workspaceSliceKey.getSliceState(state)?.recentlyUsedWsPaths).toEqual(
      [],
    );

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        wsName: 'test-path',
        openedWsPaths: OpenedWsPaths.createFromArray([]),
      },
    });
    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toEqual(undefined);
    expect(workspaceSliceKey.getSliceState(state)?.recentlyUsedWsPaths).toEqual(
      undefined,
    );

    expect(workspaceSliceKey.getSliceState(state)?.wsName).toBe('test-path');
  });

  test('updating wsPaths', () => {
    let state = createStateWithWsName('test');

    const wsPaths = ['test:one.md'];
    state = state.applyAction({
      name: 'action::workspace-context:update-ws-paths',
      value: { wsName: 'test', wsPaths },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toBe(wsPaths);
  });

  test('updating wsPaths of different wsName', () => {
    let state = createStateWithWsName('test');

    const wsPaths = ['test:one.md'];
    state = state.applyAction({
      name: 'action::workspace-context:update-ws-paths',
      value: { wsName: 'test-other', wsPaths },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toBe(undefined);
  });

  test('updating recentlyUsedWsPaths', () => {
    let state = createStateWithWsName('test');

    const recent = ['test:one.md'];
    state = state.applyAction({
      name: 'action::workspace-context:update-recently-used-ws-paths',
      value: {
        wsName: 'test',
        recentlyUsedWsPaths: recent,
      },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toBe(undefined);
    expect(workspaceSliceKey.getSliceState(state)?.recentlyUsedWsPaths).toBe(
      recent,
    );
  });

  test('updating recentlyUsedWsPaths of different wsName', () => {
    let state = createStateWithWsName('test');

    const recent = ['test:one.md'];
    state = state.applyAction({
      name: 'action::workspace-context:update-recently-used-ws-paths',
      value: {
        wsName: 'test-2',
        recentlyUsedWsPaths: recent,
      },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toBe(undefined);
    expect(workspaceSliceKey.getSliceState(state)?.recentlyUsedWsPaths).toBe(
      undefined,
    );
  });

  test('dispatching other action should not affect existing state', () => {
    let state = createState({
      wsName: 'test-workspace',
    });

    let state2 = state.applyAction({
      name: 'action::some-other-action',
    } as any);

    expect(workspaceSliceKey.getSliceState(state2)?.wsName).toBe(
      'test-workspace',
    );
    expect(workspaceSliceKey.getSliceState(state2)).toBe(
      workspaceSliceKey.getSliceState(state2),
    );
  });
});

describe('derived state', () => {
  test('updating location changes wsName', () => {
    let state = createState();

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        wsName: 'test',
        openedWsPaths: OpenedWsPaths.createFromArray(['test:k.md']),
      },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsName).toBe('test');
    expect(
      workspaceSliceKey.getSliceState(state)?.openedWsPaths.toArray(),
    ).toEqual(['test:k.md', null]);
  });

  test('derives wsPath', () => {
    let state = createStateWithWsName('test');

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        wsName: 'bangle-help',
        openedWsPaths: OpenedWsPaths.createFromArray([
          null,
          'bangle-help:getting started.md',
        ]),
      },
    });

    expect(
      workspaceSliceKey.getSliceState(state)?.openedWsPaths.getByIndex(0),
    ).toBe(undefined);

    expect(
      workspaceSliceKey.getSliceState(state)?.openedWsPaths.getByIndex(1),
    ).toBe('bangle-help:getting started.md');
  });

  test('should preserve openedWsPath properly', () => {
    let state = createStateWithWsName('test');

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        openedWsPaths: OpenedWsPaths.createFromArray(['test:k.md']),
        wsName: 'test',
      },
    });

    let state2 = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        openedWsPaths: OpenedWsPaths.createFromArray(['test:k.md']),
        wsName: 'test',
      },
    });

    expect(workspaceSliceKey.getSliceState(state)?.openedWsPaths).toBe(
      workspaceSliceKey.getSliceState(state2)?.openedWsPaths,
    );
  });

  test('updating noteWsPaths', () => {
    let state = createStateWithWsName('test');

    const wsPaths = ['test:one.md', 'test:some-other.text'];
    state = state.applyAction({
      name: 'action::workspace-context:update-ws-paths',
      value: { wsName: 'test', wsPaths },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toBe(wsPaths);
    expect(workspaceSliceKey.getSliceState(state)?.noteWsPaths).toEqual([
      wsPaths[0],
    ]);
  });
});
