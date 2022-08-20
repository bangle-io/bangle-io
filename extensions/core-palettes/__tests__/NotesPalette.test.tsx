/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, renderHook } from '@testing-library/react-hooks';

import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { getUseWorkspaceContextReturn } from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

import { useSearchWsPaths } from '../NotesPalette';

jest.mock('@bangle.io/worker-naukar-proxy', () => {
  return {
    naukarProxy: {
      abortableFzfSearchNoteWsPaths: jest.fn(),
    },
  };
});

jest.mock('@bangle.io/slice-workspace', () => {
  const workspaceThings = jest.requireActual('@bangle.io/slice-workspace');

  return {
    ...workspaceThings,
    useWorkspaceContext: jest.fn(),
  };
});

let abortableFzfSearchNoteWsPathsMock =
  naukarProxy.abortableFzfSearchNoteWsPaths as jest.MockedFunction<
    typeof naukarProxy.abortableFzfSearchNoteWsPaths
  >;

let useWorkspaceContextMock = useWorkspaceContext as jest.MockedFunction<
  typeof useWorkspaceContext
>;

beforeEach(async () => {
  abortableFzfSearchNoteWsPathsMock.mockImplementation(async () => {
    return [];
  });

  useWorkspaceContextMock.mockImplementation(() => {
    return {
      ...getUseWorkspaceContextReturn,
    };
  });
});

describe('useSearchWsPaths', () => {
  test('works correctly', async () => {
    const EMPTY_ARRAY: string[] = [];
    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        recentlyUsedWsPaths: EMPTY_ARRAY,
      };
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useSearchWsPaths(''),
    );

    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current).toEqual({ other: [], recent: [] });
  });

  test('renders correctly', async () => {
    const recentWsPaths = ['test-ws:note2.md'];
    const noteWsPaths = ['test-ws:note1.md', 'test-ws:note2.md'];

    abortableFzfSearchNoteWsPathsMock.mockImplementation(async () =>
      noteWsPaths.map((r) => ({ item: r } as any)),
    );

    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        recentlyUsedWsPaths: recentWsPaths,
      };
    });

    let result: ReturnType<typeof renderHook>['result'] | undefined,
      waitForNextUpdate: ReturnType<typeof renderHook>['waitForNextUpdate'];

    act(() => {
      ({ result, waitForNextUpdate } = renderHook(() => useSearchWsPaths('')));
    });

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(abortableFzfSearchNoteWsPathsMock).toBeCalledTimes(1);

    expect(result?.current).toEqual({
      other: ['test-ws:note1.md'],
      recent: ['test-ws:note2.md'],
    });
  });

  test('queries correctly', async () => {
    const noteWsPaths = ['test-ws:note1.md', 'test-ws:note2.md'];
    const recentWsPaths = ['test-ws:note2.md'];

    abortableFzfSearchNoteWsPathsMock.mockImplementation(async () =>
      noteWsPaths.map((r) => ({ item: r } as any)),
    );

    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        recentlyUsedWsPaths: recentWsPaths,
      };
    });

    let result: ReturnType<typeof renderHook>['result'] | undefined,
      waitForNextUpdate: ReturnType<typeof renderHook>['waitForNextUpdate'];

    act(() => {
      ({ result, waitForNextUpdate } = renderHook(() => useSearchWsPaths('2')));
    });

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(abortableFzfSearchNoteWsPathsMock).toBeCalledTimes(1);
    expect(abortableFzfSearchNoteWsPathsMock).nthCalledWith(
      1,
      expect.any(AbortSignal),
      'test-ws',
      '2',
      64,
    );

    expect(result?.current).toEqual({
      other: ['test-ws:note1.md'],
      recent: ['test-ws:note2.md'],
    });
  });

  test('if empty query returns all recent wspaths', async () => {
    const noteWsPaths = [
      'test-ws:note1.md',
      'test-ws:note2.md',
      'test-ws:note3.md',
    ];
    const recentWsPaths = ['test-ws:note2.md', 'test-ws:note3.md'];
    abortableFzfSearchNoteWsPathsMock.mockImplementation(async () => {
      await sleep(100);

      return noteWsPaths.map((r) => ({ item: r } as any));
    });

    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        recentlyUsedWsPaths: recentWsPaths,
      };
    });

    let result: ReturnType<typeof renderHook>['result'] | undefined,
      waitForNextUpdate: ReturnType<typeof renderHook>['waitForNextUpdate'];

    act(() => {
      ({ result, waitForNextUpdate } = renderHook(() => useSearchWsPaths('')));
    });
    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result?.current).toEqual({
      other: ['test-ws:note1.md'],
      recent: ['test-ws:note2.md', 'test-ws:note3.md'],
    });
  });
});
