import { listAllFiles } from 'workspace/index';
import { renderHook, act } from '@testing-library/react-hooks';
import { useFiles } from '../WorkspaceHooksContext';

jest.mock('workspace/index', () => {
  const actual = jest.requireActual('workspace/index');
  return {
    ...actual,
    listAllFiles: jest.fn(async () => []),
  };
});

describe('useFiles', () => {
  test('works', async () => {
    let render;

    act(() => {
      render = renderHook(() => useFiles('test-ws1'));
    });

    let promise;
    await act(async () => {
      return promise;
    });

    expect(render.result.current).toEqual({
      fileWsPaths: [],
      noteWsPaths: [],
      refreshWsPaths: expect.any(Function),
    });
    expect(listAllFiles).toBeCalledTimes(1);
    expect(listAllFiles).nthCalledWith(1, 'test-ws1');
  });

  test('refreshes correctly', async () => {
    let render;

    act(() => {
      render = renderHook(() => useFiles('test-ws1'));
    });

    let promise;
    await act(async () => {
      return promise;
    });

    expect(render.result.current).toEqual({
      fileWsPaths: [],
      noteWsPaths: [],
      refreshWsPaths: expect.any(Function),
    });

    listAllFiles.mockImplementation(async () => {
      return ['test-ws1:hi.md', 'test-ws1:img.png'];
    });
    await act(async () => {
      return render.result.current.refreshWsPaths();
    });

    expect(render.result.current).toEqual({
      fileWsPaths: ['test-ws1:hi.md', 'test-ws1:img.png'],
      noteWsPaths: ['test-ws1:hi.md'],
      refreshWsPaths: expect.any(Function),
    });
  });
});
