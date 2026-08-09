import { describe, expect, test, vi } from 'vitest';
import {
  createContentMatchSnippet,
  orderWsPathsForSearch,
  searchWorkspaceContent,
} from '../content-search';

describe('workspace content search', () => {
  test('orders the current note first, then recent notes, then alphabetical paths', () => {
    expect(
      orderWsPathsForSearch({
        wsPaths: ['ws:z.md', 'ws:a.md', 'ws:c.md', 'ws:b.md'],
        currentWsPath: 'ws:c.md',
        recentWsPaths: ['ws:b.md', 'ws:c.md', 'ws:deleted.md', 'ws:b.md'],
      }),
    ).toEqual(['ws:c.md', 'ws:b.md', 'ws:a.md', 'ws:z.md']);
  });

  test('creates a bounded, case-preserving highlighted snippet', () => {
    const content = `${'a'.repeat(80)} before\nNeEdLe after ${'z'.repeat(80)}`;

    expect(createContentMatchSnippet(content, 'needle')).toEqual({
      before: `…${'a'.repeat(52)} before `,
      match: 'NeEdLe',
      after: ` after ${'z'.repeat(53)}…`,
    });
  });

  test('searches sequentially in recent-first order and treats punctuation literally', async () => {
    const readText = vi.fn(async (wsPath: string) => {
      const contents: Record<string, string> = {
        'ws:a.md': 'no match',
        'ws:b.md': 'Use C++ in this note',
        'ws:c.md': 'Another c++ example',
      };
      return contents[wsPath];
    });
    const streamedMatches: string[] = [];

    const result = await searchWorkspaceContent({
      wsPaths: ['ws:a.md', 'ws:b.md', 'ws:c.md'],
      currentWsPath: 'ws:c.md',
      recentWsPaths: ['ws:b.md'],
      query: 'C++',
      signal: new AbortController().signal,
      readText,
      onMatch: (match) => streamedMatches.push(match.wsPath),
    });

    expect(readText.mock.calls.map(([wsPath]) => wsPath)).toEqual([
      'ws:c.md',
      'ws:b.md',
      'ws:a.md',
    ]);
    expect(result.matches.map((match) => match.wsPath)).toEqual([
      'ws:c.md',
      'ws:b.md',
    ]);
    expect(streamedMatches).toEqual(['ws:c.md', 'ws:b.md']);
  });

  test('continues after failed and missing reads', async () => {
    const result = await searchWorkspaceContent({
      wsPaths: ['ws:failed.md', 'ws:missing.md', 'ws:match.md'],
      recentWsPaths: [],
      query: 'needle',
      signal: new AbortController().signal,
      readText: async (wsPath) => {
        if (wsPath === 'ws:failed.md') {
          throw new Error('permission denied');
        }
        if (wsPath === 'ws:missing.md') {
          return undefined;
        }
        return 'Found a Needle here';
      },
    });

    expect(result.failedFileCount).toBe(1);
    expect(result.matches).toMatchObject([
      { wsPath: 'ws:match.md', snippet: { match: 'Needle' } },
    ]);
  });

  test('stops scheduling reads when aborted', async () => {
    const abortController = new AbortController();
    const readText = vi.fn(async () => {
      abortController.abort();
      return 'needle';
    });

    await expect(
      searchWorkspaceContent({
        wsPaths: ['ws:a.md', 'ws:b.md'],
        recentWsPaths: [],
        query: 'needle',
        signal: abortController.signal,
        readText,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(readText).toHaveBeenCalledTimes(1);
  });

  test('does not read files for queries shorter than three characters', async () => {
    const readText = vi.fn(async () => 'text');

    await expect(
      searchWorkspaceContent({
        wsPaths: ['ws:a.md'],
        recentWsPaths: [],
        query: 'ab',
        signal: new AbortController().signal,
        readText,
      }),
    ).resolves.toEqual({ matches: [], failedFileCount: 0 });
    expect(readText).not.toHaveBeenCalled();
  });
});
