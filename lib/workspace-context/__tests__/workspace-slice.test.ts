import { AppState } from '@bangle.io/create-store';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { JSON_SCHEMA_VERSION, workspaceSlice } from '..';
import { workspaceSliceKey } from '../common';
import { createState } from './test-utils';

const fileOps = {
  onNativefsAuthError: jest.fn(),
  onWorkspaceNotFound: jest.fn(),
  onInvalidPath: jest.fn(),
};

describe('serialization works', () => {
  test('serialization works', () => {
    let state = AppState.create({ slices: [workspaceSlice(fileOps)] });

    expect(
      state.stateToJSON({
        sliceFields: { workspace: workspaceSlice(fileOps) },
      }),
    ).toMatchInlineSnapshot(`
      Object {
        "workspace": Object {
          "data": Object {
            "locationPathname": "/",
            "locationSearchQuery": "",
            "recentlyUsedWsPaths": null,
            "wsPaths": null,
          },
          "version": "workspace-slice/1",
        },
      }
    `);
  });

  test("doesn't parse incorrect schema", () => {
    let state = AppState.stateFromJSON({
      slices: [workspaceSlice(fileOps)],
      json: {
        workspace: {
          version: 'wrong-version',
          data: { locationPathname: '/test-123' },
        },
      },
      sliceFields: { workspace: workspaceSlice(fileOps) },
    });

    expect(workspaceSliceKey.getSliceState(state)).toMatchInlineSnapshot(`
      WorkspaceSliceState {
        "mainFields": Object {
          "locationPathname": "/",
          "locationSearchQuery": "",
          "recentlyUsedWsPaths": undefined,
          "wsPaths": undefined,
        },
        "opts": Object {},
      }
    `);
  });

  test('parsing wsPaths', () => {
    let state = AppState.stateFromJSON({
      slices: [workspaceSlice(fileOps)],
      json: {
        workspace: {
          version: JSON_SCHEMA_VERSION,
          data: { wsPaths: ['test:one.md', 'test:from.md'] },
        },
      },
      sliceFields: { workspace: workspaceSlice(fileOps) },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toEqual([
      'test:one.md',
      'test:from.md',
    ]);

    expect(workspaceSliceKey.getSliceState(state)).toMatchInlineSnapshot(`
      WorkspaceSliceState {
        "mainFields": Object {
          "locationPathname": undefined,
          "locationSearchQuery": undefined,
          "recentlyUsedWsPaths": undefined,
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
        sliceFields: { workspace: workspaceSlice(fileOps) },
      }),
    ).toMatchInlineSnapshot(`
      Object {
        "workspace": Object {
          "data": Object {
            "locationPathname": null,
            "locationSearchQuery": null,
            "recentlyUsedWsPaths": null,
            "wsPaths": Array [
              "test:one.md",
              "test:from.md",
            ],
          },
          "version": "workspace-slice/1",
        },
      }
    `);
  });

  test('parsing recentlyUsedWsPaths', () => {
    let state = AppState.stateFromJSON({
      slices: [workspaceSlice(fileOps)],
      json: {
        workspace: {
          version: JSON_SCHEMA_VERSION,
          data: {
            locationPathname: '/ws/bangle-help/test-path/k.md',
            locationSearchQuery: 'secondary=bangle-help%3Agetting+started.md',
          },
        },
      },
      sliceFields: { workspace: workspaceSlice(fileOps) },
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
        sliceFields: { workspace: workspaceSlice(fileOps) },
      }),
    ).toMatchInlineSnapshot(`
      Object {
        "workspace": Object {
          "data": Object {
            "locationPathname": "/ws/bangle-help/test-path/k.md",
            "locationSearchQuery": "secondary=bangle-help%3Agetting+started.md",
            "recentlyUsedWsPaths": null,
            "wsPaths": null,
          },
          "version": "workspace-slice/1",
        },
      }
    `);
  });
});

describe('state', () => {
  test('updates location', () => {
    let state = createState();

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: 'test-path',
        locationSearchQuery: 'test-query',
      },
    });

    expect(workspaceSliceKey.getSliceState(state)?.locationPathname).toBe(
      'test-path',
    );
    expect(workspaceSliceKey.getSliceState(state)?.locationSearchQuery).toBe(
      'test-query',
    );
  });

  test('updating wsPaths', () => {
    let state = createState();

    const wsPaths = ['test:one.md'];
    state = state.applyAction({
      name: 'action::workspace-context:update-ws-paths',
      value: wsPaths,
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toBe(wsPaths);
  });

  test('updating recentlyUsedWsPaths', () => {
    let state = createState();

    const recent = ['test:one.md'];
    state = state.applyAction({
      name: 'action::workspace-context:update-recently-used-ws-paths',
      value: recent,
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toBe(undefined);
    expect(workspaceSliceKey.getSliceState(state)?.recentlyUsedWsPaths).toBe(
      recent,
    );
  });

  test('dispatching other action should not affect existing state', () => {
    let state = createState({ locationPathname: '/ws/test-workspace/k.md' });

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
        locationPathname: '/ws/test-path/k.md',
        locationSearchQuery: 'test-query',
      },
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsName).toBe('test-path');
    expect(
      workspaceSliceKey.getSliceState(state)?.openedWsPaths.toArray(),
    ).toEqual(['test-path:k.md', null]);
  });

  test('derives wsPath', () => {
    let state = createState();

    state = state.applyAction({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: '',
        locationSearchQuery: 'secondary=bangle-help%3Agetting+started.md',
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
    let state = createState();

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

    expect(workspaceSliceKey.getSliceState(state)?.openedWsPaths).toBe(
      workspaceSliceKey.getSliceState(state2)?.openedWsPaths,
    );
  });

  test('updating noteWsPaths', () => {
    let state = createState();

    const wsPaths = ['test:one.md', 'test:some-other.text'];
    state = state.applyAction({
      name: 'action::workspace-context:update-ws-paths',
      value: wsPaths,
    });

    expect(workspaceSliceKey.getSliceState(state)?.wsPaths).toBe(wsPaths);
    expect(workspaceSliceKey.getSliceState(state)?.noteWsPaths).toEqual([
      wsPaths[0],
    ]);
  });
});
