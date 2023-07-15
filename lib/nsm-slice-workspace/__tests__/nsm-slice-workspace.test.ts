import { store } from '@bangle.io/nsm-3';
import { nsmPageSlice, syncPageLocation } from '@bangle.io/slice-page';
import { createWsName, createWsPath } from '@bangle.io/ws-path';

import {
  nsmSliceWorkspace,
  setMiniWsPath,
  setPopupWsPath,
  setRecentlyUsedWsPaths,
  setWsPaths,
} from '../nsm-slice-workspace';

const createStore = () => {
  const myStore = store({
    storeName: 'myStore',
    slices: [nsmPageSlice, nsmSliceWorkspace],
  });

  return {
    store: myStore,
  };
};
describe('nsmSliceWorkspace', () => {
  let store: ReturnType<typeof createStore>['store'];
  let testWsName1 = createWsName('test-ws-1');
  let testWsName2 = createWsName('test-ws-2');
  let path1 = createWsPath('test-ws-1:path1');
  let path2 = createWsPath('test-ws-1:path2');
  let notePath3 = createWsPath('test-ws-1:path3.md');
  let testWsName2Path1 = createWsPath('test-ws-2:path1.md');

  beforeEach(() => {
    let result = createStore();
    store = result.store;
  });

  test('setRecentlyUsedWsPaths', () => {
    store.dispatch(
      setRecentlyUsedWsPaths({
        wsName: testWsName1,
        recentlyUsedWsPaths: [path1, path2],
      }),
    );

    const state = store.state;
    const { recentlyUsedWsPaths } =
      nsmSliceWorkspace.get(state).workspaceData[testWsName1] || {};
    expect(recentlyUsedWsPaths).toEqual([path1, path2]);
  });

  test('setWsPaths', () => {
    store.dispatch(
      setWsPaths({
        wsName: testWsName1,
        wsPaths: [path1, path2],
      }),
    );

    const state = store.state;
    const { wsPaths } =
      nsmSliceWorkspace.get(state).workspaceData[testWsName1] || {};
    expect(wsPaths).toEqual([path1, path2]);
  });

  test('setMiniWsPath', () => {
    store.dispatch(
      setMiniWsPath({
        wsName: testWsName1,
        wsPath: path1,
      }),
    );

    const state = store.state;
    const { miniEditorWsPath } =
      nsmSliceWorkspace.get(state).workspaceData[testWsName1] || {};
    expect(miniEditorWsPath).toEqual(path1);
  });

  test('setPopupWsPath', () => {
    store.dispatch(
      setPopupWsPath({
        wsName: testWsName1,
        wsPath: path1,
      }),
    );

    const state = store.state;
    const { popupEditorWsPath } =
      nsmSliceWorkspace.get(state).workspaceData[testWsName1] || {};
    expect(popupEditorWsPath).toEqual(path1);
  });

  test('multiple workspaces', async () => {
    store.dispatch(
      setWsPaths({
        wsName: testWsName1,
        wsPaths: [path1, path2],
      }),
    );

    expect(nsmSliceWorkspace.get(store.state).noteWsPaths).toBeUndefined();
    expect(nsmSliceWorkspace.get(store.state).openedWsPaths.openCount).toBe(0);
    expect(nsmSliceWorkspace.get(store.state).wsName).toBeUndefined();
    expect(nsmSliceWorkspace.get(store.state).wsPaths).toBeUndefined();
    expect(nsmSliceWorkspace.get(store.state).workspaceData)
      .toMatchInlineSnapshot(`
      {
        "test-ws-1": {
          "miniEditorWsPath": undefined,
          "popupEditorWsPath": undefined,
          "recentlyUsedWsPaths": undefined,
          "wsPaths": [
            "test-ws-1:path1",
            "test-ws-1:path2",
          ],
        },
      }
    `);

    store.dispatch(
      setWsPaths({
        wsName: testWsName1,
        wsPaths: [path1, path2, notePath3],
      }),
    );

    expect(nsmSliceWorkspace.get(store.state).workspaceData)
      .toMatchInlineSnapshot(`
      {
        "test-ws-1": {
          "miniEditorWsPath": undefined,
          "popupEditorWsPath": undefined,
          "recentlyUsedWsPaths": undefined,
          "wsPaths": [
            "test-ws-1:path1",
            "test-ws-1:path2",
            "test-ws-1:path3.md",
          ],
        },
      }
    `);

    store.dispatch(
      syncPageLocation({
        pathname: '/ws/test-ws-1',
        search: '',
      }),
    );

    expect(nsmSliceWorkspace.get(store.state).wsName).toBe(testWsName1);

    store.dispatch(
      syncPageLocation({
        pathname: '/ws/test-ws-1/path1.md',
        search: 'secondary=test-ws-1%253A1-rule.md',
      }),
    );

    expect(nsmSliceWorkspace.get(store.state).openedWsPaths.openCount).toBe(2);
    expect(nsmSliceWorkspace.get(store.state).noteWsPaths).toEqual([notePath3]);

    store.dispatch(
      setWsPaths({
        wsName: testWsName2,
        wsPaths: [testWsName2Path1],
      }),
    );
    expect(nsmSliceWorkspace.get(store.state).workspaceData)
      .toMatchInlineSnapshot(`
      {
        "test-ws-1": {
          "miniEditorWsPath": undefined,
          "popupEditorWsPath": undefined,
          "recentlyUsedWsPaths": undefined,
          "wsPaths": [
            "test-ws-1:path1",
            "test-ws-1:path2",
            "test-ws-1:path3.md",
          ],
        },
        "test-ws-2": {
          "miniEditorWsPath": undefined,
          "popupEditorWsPath": undefined,
          "recentlyUsedWsPaths": undefined,
          "wsPaths": [
            "test-ws-2:path1.md",
          ],
        },
      }
    `);

    store.dispatch(
      syncPageLocation({
        pathname: '/ws/test-ws-2/path1',
        search: '',
      }),
    );

    expect(nsmSliceWorkspace.get(store.state).noteWsPaths).toEqual([
      'test-ws-2:path1.md',
    ]);
  });
});
