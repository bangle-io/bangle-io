import {
  getLastWorkspaceUsed,
  saveLastWorkspaceUsed,
} from '../last-seen-ws-name';

jest.mock('@bangle.io/workspaces', () => {
  const rest = jest.requireActual('@bangle.io/workspaces');
  return {
    ...rest,
    getWorkspaceInfo: jest.fn(),
  };
});

let originalLocalStorage;

beforeEach(() => {
  originalLocalStorage = window.localStorage;
  let store = {};

  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn((key) => {
        return store[key] || null;
      }),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      clear() {
        store = {};
      },
    },
    writable: true,
  });
});

afterEach(() => {
  (window as any).localStorage = originalLocalStorage;
});

test('works 1', () => {
  saveLastWorkspaceUsed('test-ws');

  expect(window.localStorage.setItem).toBeCalledTimes(1);
  expect(window.localStorage.setItem).nthCalledWith(
    1,
    'workspace-context/last-workspace-used',
    'test-ws',
  );

  expect(getLastWorkspaceUsed()).toBe('test-ws');

  expect(window.localStorage.getItem).toBeCalledTimes(1);
});

test('works when not defined', () => {
  expect(getLastWorkspaceUsed()).toBeUndefined();
});
