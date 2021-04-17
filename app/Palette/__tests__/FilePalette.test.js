import { renderHook } from '@testing-library/react-hooks';
import { useRecordRecentWsPaths } from 'app/hooks';
import { useLocalStorage } from 'utils/index';

let mockWsName, mockWsPath;

jest.mock('utils/index', () => {
  return {
    ...jest.requireActual('utils'), // import and retain the original functionalities
    useLocalStorage: jest.fn(),
  };
});
jest.mock('workspace/index', () => {
  const actual = jest.requireActual('workspace/index');
  return {
    ...actual,
    useWorkspacePath: jest.fn(() => ({
      wsName: mockWsName,
      wsPath: mockWsPath,
    })),
    useWorkspaces: jest.fn(),
    useGetCachedWorkspaceFiles: jest.fn(),
    useCreateMdFile: jest.fn(),
    useRenameActiveFile: jest.fn(),
    useDeleteFile: jest.fn(),
  };
});

describe('useRecordRecentWsPaths', () => {
  let store;

  beforeEach(() => {
    mockWsName = 'my-ws';
    mockWsPath = 'my-ws:something';
    store = {};
    useLocalStorage.mockImplementation((key, defaultValue) => {
      if (!store.value) {
        store.value = defaultValue;
      }
      return [
        store.value,
        (val) => {
          const finalVal = val instanceof Function ? val(store.value) : val;
          store.value = finalVal;
          return;
        },
      ];
    });
  });

  test('sets up', async () => {
    const { result } = renderHook(() => useRecordRecentWsPaths([]));
    expect(result.current).toEqual([]);
    expect(useLocalStorage).toBeCalledWith(
      'useRecordRecentWsPaths2-XihLDmy-ws',
      [],
    );
  });

  test('saves files', async () => {
    mockWsPath = 'x';
    let filePaths = ['a', 'b', 'c', 'x'];

    const { result, rerender } = renderHook(() =>
      useRecordRecentWsPaths(filePaths),
    );

    rerender();

    expect(result.current).toEqual(['x']);

    mockWsPath = 'y';
    filePaths = [...filePaths, 'y'];

    rerender();
    // second rerender as state is update on seeing a new wsPAth
    rerender();
    expect(result.current).toEqual(['y', 'x']);
  });

  test('removes files that are no longer valid', async () => {
    // retrieve an existing state
    store.value = ['y', 'x'];
    mockWsPath = 'x';
    let filePaths = ['a', 'b', 'c', 'y', 'x'];

    const { result, rerender } = renderHook(() =>
      useRecordRecentWsPaths(filePaths),
    );

    rerender();

    expect(result.current).toEqual(['x', 'y']);

    filePaths = ['a', 'b', 'c', 'x'];

    rerender();
    rerender();

    expect(result.current).toEqual(['x']);
  });
});
