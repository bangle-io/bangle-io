import {
  MAX_OPEN_EDITORS,
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import { AppState } from '@bangle.io/create-store';
import { makeArrayOfSize } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { workspaceSliceKey } from '../common';
import { WorkspaceError } from '../errors';
import { JSON_SCHEMA_VERSION } from '../workspace-slice';
import {
  createState,
  createStateWithWsName,
  createWsInfo,
  workspaceSliceWithStateSerialization,
} from './test-utils';

describe('serialization works', () => {
  test('serialization works', () => {
    let state = AppState.create({
      slices: [workspaceSliceWithStateSerialization()],
    });

    expect(
      state.stateToJSON({
        sliceFields: { workspace: workspaceSliceWithStateSerialization() },
      }),
    ).toMatchInlineSnapshot(`
      {
        "workspace": {
          "data": {
            "cachedWorkspaceInfo": null,
            "error": null,
            "openedWsPaths": [
              null,
              null,
              null,
              null,
            ],
            "recentlyUsedWsPaths": null,
            "refreshCounter": 0,
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
      slices: [workspaceSliceWithStateSerialization()],
      json: {
        workspace: {
          version: 'wrong-version',
          data: { locationPathname: '/test-123' },
        },
      },
      sliceFields: { workspace: workspaceSliceWithStateSerialization() },
    });

    expect(workspaceSliceKey.getSliceState(state)).toMatchInlineSnapshot(`
      WorkspaceSliceState {
        "mainFields": {
          "cachedWorkspaceInfo": undefined,
          "error": undefined,
          "openedWsPaths": OpenedWsPaths {
            "_wsPaths": [
              undefined,
              undefined,
              undefined,
              undefined,
            ],
          },
          "recentlyUsedWsPaths": undefined,
          "refreshCounter": 0,
          "wsName": undefined,
          "wsPaths": undefined,
        },
        "opts": {},
      }
    `);
  });

  test('parsing wsPaths', () => {
    let state = AppState.stateFromJSON({
      slices: [workspaceSliceWithStateSerialization()],
      json: {
        workspace: {
          version: JSON_SCHEMA_VERSION,
          data: { wsPaths: ['test:one.md', 'test:from.md'] },
        },
      },
      sliceFields: { workspace: workspaceSliceWithStateSerialization() },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toEqual([
      'test:one.md',
      'test:from.md',
    ]);

    expect(workspaceSliceKey.getSliceState(state)).toMatchInlineSnapshot(`
      WorkspaceSliceState {
        "mainFields": {
          "cachedWorkspaceInfo": undefined,
          "error": undefined,
          "openedWsPaths": OpenedWsPaths {
            "_wsPaths": [
              undefined,
              undefined,
              undefined,
              undefined,
            ],
          },
          "recentlyUsedWsPaths": undefined,
          "refreshCounter": 0,
          "wsName": undefined,
          "wsPaths": [
            "test:one.md",
            "test:from.md",
          ],
        },
        "opts": {},
      }
    `);

    expect(
      state.stateToJSON({
        sliceFields: { workspace: workspaceSliceWithStateSerialization() },
      }),
    ).toMatchInlineSnapshot(`
      {
        "workspace": {
          "data": {
            "cachedWorkspaceInfo": null,
            "error": null,
            "openedWsPaths": [
              null,
              null,
              null,
              null,
            ],
            "recentlyUsedWsPaths": null,
            "refreshCounter": 0,
            "wsName": null,
            "wsPaths": [
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
      slices: [workspaceSliceWithStateSerialization()],
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
      sliceFields: { workspace: workspaceSliceWithStateSerialization() },
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
        sliceFields: { workspace: workspaceSliceWithStateSerialization() },
      }),
    ).toEqual({
      workspace: {
        data: {
          cachedWorkspaceInfo: null,
          openedWsPaths: makeArrayOfSize(MAX_OPEN_EDITORS, null, [
            'bangle-help:test-path/k.md',
            'bangle-help:getting started.md',
          ]),
          recentlyUsedWsPaths: null,
          wsName: 'bangle-help',
          wsPaths: null,
          refreshCounter: 0,
          error: null,
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
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
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

  test('updating ws-name increments refreshCounter', () => {
    let state = createState();

    let newState = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        wsName: 'test-path',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    expect(workspaceSliceKey.getSliceState(newState)?.wsName).toBe('test-path');
    expect(
      workspaceSliceKey.getSliceState(newState)?.openedWsPaths.toArray(),
    ).toEqual(OpenedWsPaths.createEmpty().toArray());
    expect(
      workspaceSliceKey.getSliceStateAsserted(state).refreshCounter + 1,
    ).toBe(workspaceSliceKey.getSliceStateAsserted(newState).refreshCounter);
  });

  test('change of location does not reset wsPath', () => {
    const wsPaths = ['test-ws:hello-world'];
    let state = createState({
      wsName: 'test-ws',
      wsPaths: wsPaths,
      recentlyUsedWsPaths: wsPaths,
    });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toEqual(wsPaths);

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
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
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
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
      name: 'action::@bangle.io/slice-workspace:update-ws-paths',
      value: { wsName: 'test', wsPaths },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toBe(wsPaths);
  });

  test('updating wsPaths of different wsName', () => {
    let state = createStateWithWsName('test');

    const wsPaths = ['test:one.md'];
    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:update-ws-paths',
      value: { wsName: 'test-other', wsPaths },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toBe(undefined);
  });

  test('updating recentlyUsedWsPaths', () => {
    let state = createStateWithWsName('test');

    const recent = ['test:one.md'];
    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
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
      name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
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

describe('error cases', () => {
  let consoleLog = console.log;
  beforeEach(() => {
    console.log = jest.fn();
  });
  afterEach(() => {
    console.log = consoleLog;
  });

  test('ignores actions when error exists', () => {
    let state = createState({
      openedWsPaths: ['test-ws:k.md'],
      wsName: 'test-ws',
    });
    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: new WorkspaceError({ message: 'failed' }),
      },
    });

    const wsPaths = ['test-ws:a.md'];
    let newState1 = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:update-ws-paths',
      value: { wsName: 'test-ws', wsPaths },
    });

    // slice state remains same when there is an error
    expect(workspaceSliceKey.getSliceStateAsserted(newState1)).toBe(
      workspaceSliceKey.getSliceStateAsserted(state),
    );

    expect(workspaceSliceKey.getSliceStateAsserted(newState1).wsPaths).toBe(
      undefined,
    );

    let newState2 = newState1.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: { error: undefined },
    });

    let newState3 = newState2.applyAction({
      name: 'action::@bangle.io/slice-workspace:update-ws-paths',
      value: { wsName: 'test-ws', wsPaths },
    });

    // slice state should be updated since we removed error
    expect(workspaceSliceKey.getSliceStateAsserted(newState3)).not.toBe(
      workspaceSliceKey.getSliceStateAsserted(newState2),
    );

    expect(workspaceSliceKey.getSliceStateAsserted(newState3).wsPaths).toBe(
      wsPaths,
    );
  });

  test('ignores actions when error exists 2', () => {
    let state = createState({});

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: new WorkspaceError({ message: 'failed' }),
      },
    });

    const newState1 = state
      .applyAction({
        name: 'action::@bangle.io/slice-workspace:refresh-ws-paths',
      })
      .applyAction({
        name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
        value: {
          openedWsPaths: OpenedWsPaths.createFromArray(['test-ws:one.md']),
          wsName: 'test-ws',
        },
      })
      .applyAction({
        name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
        value: {
          recentlyUsedWsPaths: [],
          wsName: 'test-ws',
        },
      });

    expect(workspaceSliceKey.getSliceStateAsserted(newState1)).toBe(
      workspaceSliceKey.getSliceStateAsserted(state),
    );
  });
});

describe('derived state', () => {
  test('updating location changes wsName', () => {
    let state = createState();

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        wsName: 'test',
        openedWsPaths: OpenedWsPaths.createFromArray(['test:k.md']),
      },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsName).toBe('test');
    expect(
      workspaceSliceKey.getSliceState(state)?.openedWsPaths.toArray(),
    ).toEqual(makeArrayOfSize(MAX_OPEN_EDITORS, null, ['test:k.md', null]));
  });

  test('derives wsPath', () => {
    let state = createStateWithWsName('test');

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        wsName: 'bangle-help',
        openedWsPaths: OpenedWsPaths.createFromArray([
          null,
          'bangle-help:getting started.md',
        ]),
      },
    });

    expect(
      workspaceSliceKey
        .getSliceState(state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toBe(undefined);

    expect(
      workspaceSliceKey
        .getSliceState(state)
        ?.openedWsPaths.getByIndex(SECONDARY_EDITOR_INDEX),
    ).toBe('bangle-help:getting started.md');
  });

  test('should preserve openedWsPath properly', () => {
    let state = createStateWithWsName('test');

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        openedWsPaths: OpenedWsPaths.createFromArray(['test:k.md']),
        wsName: 'test',
      },
    });

    let state2 = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
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
      name: 'action::@bangle.io/slice-workspace:update-ws-paths',
      value: { wsName: 'test', wsPaths },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toBe(wsPaths);
    expect(workspaceSliceKey.getSliceState(state)?.noteWsPaths).toEqual([
      wsPaths[0],
    ]);
  });
});

describe('workspaceInfo', () => {
  test('works on blank', () => {
    let state = createState();

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-cached-workspace-info',
      value: {},
    });

    expect(
      workspaceSliceKey.getSliceStateAsserted(state).cachedWorkspaceInfo,
    ).toEqual(undefined);
  });

  test('with some data', () => {
    let state = createState();

    const wsInfo = createWsInfo({ name: 'testWs' });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-cached-workspace-info',
      value: {
        workspaceInfo: wsInfo,
      },
    });

    expect(
      workspaceSliceKey.getSliceStateAsserted(state).cachedWorkspaceInfo,
    ).toEqual(wsInfo);
  });
});
