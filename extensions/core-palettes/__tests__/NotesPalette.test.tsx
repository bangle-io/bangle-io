import { act, renderHook } from '@testing-library/react-hooks';

import { useWorkspaceContext } from '@bangle.io/workspace-context';

import { useSearchWsPaths } from '../NotesPalette';

jest.mock('@bangle.io/workspace-context', () => {
  const workspaceThings = jest.requireActual('@bangle.io/workspace-context');
  return {
    ...workspaceThings,
    useWorkspaceContext: jest.fn(),
  };
});

describe('useSearchWsPaths', () => {
  test('works correctly', () => {
    const EMPTY_ARRAY = [];
    (useWorkspaceContext as any).mockImplementation(() => {
      return { noteWsPaths: EMPTY_ARRAY, recentWsPaths: EMPTY_ARRAY };
    });

    const { result } = renderHook(() => useSearchWsPaths(''));
    expect(result.current).toEqual({ other: [], recent: [] });
  });

  test('renders correctly', () => {
    const noteWsPaths = ['test-ws:note1.md', 'test-ws:note2.md'];
    const recentWsPaths = ['test-ws:note2.md'];
    (useWorkspaceContext as any).mockImplementation(() => {
      return { noteWsPaths, recentWsPaths };
    });

    const { result } = renderHook(() => useSearchWsPaths(''));
    expect(result.current).toEqual({
      other: ['test-ws:note1.md'],
      recent: ['test-ws:note2.md'],
    });
  });

  test('queries correctly', () => {
    const noteWsPaths = ['test-ws:note1.md', 'test-ws:note2.md'];
    const recentWsPaths = ['test-ws:note2.md'];
    (useWorkspaceContext as any).mockImplementation(() => {
      return { noteWsPaths, recentWsPaths };
    });

    const { result } = renderHook(() => useSearchWsPaths('2'));
    expect(result.current).toEqual({
      other: [],
      recent: ['test-ws:note2.md'],
    });
  });

  test('if empty query returns all recent wspaths', () => {
    const noteWsPaths = [
      'test-ws:note1.md',
      'test-ws:note2.md',
      'test-ws:note3.md',
    ];
    const recentWsPaths = ['test-ws:note2.md', 'test-ws:note3.md'];
    (useWorkspaceContext as any).mockImplementation(() => {
      return { noteWsPaths, recentWsPaths };
    });

    const { result } = renderHook(() => useSearchWsPaths(''));
    expect(result.current).toEqual({
      other: ['test-ws:note1.md'],
      recent: ['test-ws:note2.md', 'test-ws:note3.md'],
    });
  });
});
