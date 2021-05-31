import * as idb from 'idb-keyval';
import { helpFSWorkspaceInfo } from 'config/help-fs';
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaceInfo,
  listWorkspaces,
} from '../workspace-helpers';

const mockStore = new Map();

jest.mock('idb-keyval', () => {
  const idb = {};
  idb.get = jest.fn(async (key) => {
    const value = mockStore.get(key);
    if (value == null) {
      return undefined;
    }
    // to mimic idb returning new instance of value
    return JSON.parse(JSON.stringify(value));
  });
  idb.del = jest.fn(async (...args) => {
    return mockStore.delete(...args);
  });
  idb.set = jest.fn(async (key, value) => {
    console.log({ value });
    return mockStore.set(key, value);
  });
  idb.keys = jest.fn(async (...args) => {
    return Array.from(mockStore.keys(...args));
  });
  return idb;
});

beforeEach(() => {
  mockStore.clear();
});

describe('listWorkspaces', () => {
  test('returns help-fs initially', async () => {
    const result = await listWorkspaces();
    expect(result).toEqual([helpFSWorkspaceInfo]);
  });

  test('when a workspace exists in idb', async () => {
    await createWorkspace('test-1');

    const result = await listWorkspaces();
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "metadata": Object {},
          "name": "test-1",
          "type": "browser",
        },
        Object {
          "metadata": Object {
            "allowLocalChanges": true,
          },
          "name": "bangle-help",
          "type": "helpfs",
        },
      ]
    `);
  });

  test('retains the identity of a workspace info', async () => {
    await createWorkspace('test-1');
    const test1 = await getWorkspaceInfo('test-1');
    await createWorkspace('test-2');
    const test2 = await getWorkspaceInfo('test-2');

    let result = await listWorkspaces();
    expect(result.includes(test1)).toBe(true);
    await deleteWorkspace('test-2');
    result = await listWorkspaces();

    expect(result.includes(test2)).toBe(false);
    expect(result.includes(test1)).toBe(true);
  });
});
