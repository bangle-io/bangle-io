import { workspaceSliceKey } from '../common';
import { createState, createWsInfo } from './test-utils';

describe('state', () => {
  test('works on blank', () => {
    let state = createState();

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {},
      },
    });

    expect(
      workspaceSliceKey.getSliceStateAsserted(state).workspacesInfo,
    ).toEqual({});
  });

  test('with some data', () => {
    let state = createState();

    const wsInfo = createWsInfo({ name: 'testWs' });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          testWs: createWsInfo({ name: 'testWs' }),
        },
      },
    });

    expect(
      workspaceSliceKey.getSliceStateAsserted(state).workspacesInfo,
    ).toEqual({ testWs: wsInfo });
  });

  test('with lot of data', () => {
    let state = createState();

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          testWs: createWsInfo({ name: 'testWs' }),
          testWs2: createWsInfo({ name: 'testWs2' }),
          testWs3: createWsInfo({ name: 'testWs3' }),
        },
      },
    });

    expect(
      workspaceSliceKey.getSliceStateAsserted(state).workspacesInfo,
    ).toEqual({
      testWs: createWsInfo({ name: 'testWs' }),
      testWs2: createWsInfo({ name: 'testWs2' }),
      testWs3: createWsInfo({ name: 'testWs3' }),
    });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          testWs: createWsInfo({ name: 'testWs' }),
          testWs3: createWsInfo({ name: 'testWs3', lastModified: 7 }),
        },
      },
    });

    expect(
      workspaceSliceKey.getSliceStateAsserted(state).workspacesInfo,
    ).toEqual({
      testWs: createWsInfo({ name: 'testWs' }),
      testWs2: createWsInfo({ name: 'testWs2' }),
      testWs3: createWsInfo({ name: 'testWs3', lastModified: 7 }),
    });
  });

  test('merges with data when no clash', () => {
    let state = createState();

    const wsInfo = createWsInfo({ name: 'testWs' });
    const wsInfo2 = createWsInfo({ name: 'testWs2' });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          [wsInfo.name]: wsInfo,
        },
      },
    });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          [wsInfo2.name]: wsInfo2,
        },
      },
    });

    expect(
      workspaceSliceKey.getSliceStateAsserted(state).workspacesInfo,
    ).toEqual({
      [wsInfo.name]: wsInfo,
      [wsInfo2.name]: wsInfo2,
    });
  });
});

describe('same wsName', () => {
  test('retains the existing data if incoming is older', () => {
    let state = createState();

    const wsInfo = createWsInfo({ name: 'testWs', lastModified: 5 });
    const wsInfo2 = createWsInfo({ name: 'testWs', lastModified: 3 });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          [wsInfo.name]: wsInfo,
        },
      },
    });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          [wsInfo2.name]: wsInfo2,
        },
      },
    });

    expect(
      workspaceSliceKey.getSliceStateAsserted(state).workspacesInfo,
    ).toEqual({
      [wsInfo.name]: wsInfo,
    });
  });

  test('overwrites the existing data if incoming is new', () => {
    let state = createState();

    const wsInfo = createWsInfo({ name: 'testWs', lastModified: 5 });
    const wsInfo2 = createWsInfo({ name: 'testWs', lastModified: 7 });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          [wsInfo.name]: wsInfo,
        },
      },
    });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          [wsInfo2.name]: wsInfo2,
        },
      },
    });

    expect(
      workspaceSliceKey.getSliceStateAsserted(state).workspacesInfo,
    ).toEqual({
      [wsInfo.name]: wsInfo2,
    });
  });

  test('other fields donot affect overwritting check if lastModified is same', () => {
    let state = createState();

    const wsInfo = createWsInfo({
      name: 'testWs',
      lastModified: 5,
      metadata: { bubbles: '' },
    });
    const wsInfo2 = createWsInfo({
      name: 'testWs',
      lastModified: 5,
      deleted: true,
      metadata: { bubbles: '' },
    });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          [wsInfo.name]: wsInfo,
        },
      },
    });

    let newState = state.applyAction({
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          [wsInfo2.name]: wsInfo2,
        },
      },
    });

    expect(
      workspaceSliceKey.getSliceStateAsserted(state).workspacesInfo,
    ).toEqual({
      [wsInfo.name]: wsInfo,
    });

    expect(
      workspaceSliceKey.getSliceStateAsserted(newState).workspacesInfo,
    ).toBe(workspaceSliceKey.getSliceStateAsserted(state).workspacesInfo);
  });
});
