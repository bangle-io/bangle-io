import { describe, expect, test, vi } from 'vitest';
import {
  findTextMatches,
  MAX_TEXT_SEARCH_RESULTS,
  orderWsPathsForTextSearch,
  searchWorkspaceText,
} from '../workspace-text-search';

describe('workspace text search', () => {
  test('orders the preferred note first, then recent notes, then alphabetical paths', () => {
    expect(
      orderWsPathsForTextSearch({
        wsPaths: ['ws:z.md', 'ws:a.md', 'ws:c.md', 'ws:b.md'],
        preferredWsPath: 'ws:c.md',
        recentWsPaths: ['ws:b.md', 'ws:c.md', 'ws:deleted.md', 'ws:b.md'],
      }),
    ).toEqual(['ws:c.md', 'ws:b.md', 'ws:a.md', 'ws:z.md']);
  });

  test('finds every non-overlapping literal match with source casing and line numbers', () => {
    expect(findTextMatches('C++ once\nand c++ twice', 'c++')).toEqual({
      matches: [
        {
          index: 0,
          lineNumber: 1,
          snippet: { before: '', match: 'C++', after: ' once and c++ twice' },
        },
        {
          index: 13,
          lineNumber: 2,
          snippet: { before: 'C++ once and ', match: 'c++', after: ' twice' },
        },
      ],
      truncated: false,
    });
  });

  test('creates bounded contextual snippets', () => {
    const content = `${'a'.repeat(80)} before\nNeEdLe after ${'z'.repeat(80)}`;

    expect(findTextMatches(content, 'needle').matches[0]).toEqual({
      index: 88,
      lineNumber: 2,
      snippet: {
        before: `…${'a'.repeat(52)} before `,
        match: 'NeEdLe',
        after: ` after ${'z'.repeat(53)}…`,
      },
    });
  });

  test('streams matches sequentially in recent-first order', async () => {
    const readText = vi.fn(async (wsPath: string) => {
      const contents: Record<string, string> = {
        'ws:a.md': 'no match',
        'ws:b.md': 'needle twice needle',
        'ws:c.md': 'Needle first',
      };
      return contents[wsPath];
    });
    const streamedMatches: string[] = [];

    const result = await searchWorkspaceText({
      wsPaths: ['ws:a.md', 'ws:b.md', 'ws:c.md'],
      preferredWsPath: 'ws:c.md',
      recentWsPaths: ['ws:b.md'],
      query: 'needle',
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
      'ws:b.md',
    ]);
    expect(streamedMatches).toEqual(['ws:c.md', 'ws:b.md', 'ws:b.md']);
  });

  test('continues after failed and missing reads', async () => {
    const result = await searchWorkspaceText({
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

    expect(result).toMatchObject({
      failedFileCount: 1,
      searchedFileCount: 1,
      matches: [{ wsPath: 'ws:match.md', snippet: { match: 'Needle' } }],
    });
  });

  test('stops scheduling reads when aborted', async () => {
    const abortController = new AbortController();
    const readText = vi.fn(async () => {
      abortController.abort();
      return 'needle';
    });

    await expect(
      searchWorkspaceText({
        wsPaths: ['ws:a.md', 'ws:b.md'],
        recentWsPaths: [],
        query: 'needle',
        signal: abortController.signal,
        readText,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(readText).toHaveBeenCalledTimes(1);
  });

  test('does not read files for short queries and caps large result sets', async () => {
    const readText = vi.fn(async () => 'needle '.repeat(300));

    await expect(
      searchWorkspaceText({
        wsPaths: ['ws:a.md'],
        recentWsPaths: [],
        query: 'ab',
        signal: new AbortController().signal,
        readText,
      }),
    ).resolves.toMatchObject({ matches: [], searchedFileCount: 0 });
    expect(readText).not.toHaveBeenCalled();

    const result = await searchWorkspaceText({
      wsPaths: ['ws:a.md', 'ws:b.md', 'ws:c.md', 'ws:d.md'],
      recentWsPaths: [],
      query: 'needle',
      signal: new AbortController().signal,
      readText,
    });
    expect(result.matches).toHaveLength(MAX_TEXT_SEARCH_RESULTS);
    expect(result.truncated).toBe(true);
    expect(readText).toHaveBeenCalledTimes(1);
  });

  test('reports truncation only when matches remain after the global cap', async () => {
    const exactlyAtLimit = 'needle '.repeat(MAX_TEXT_SEARCH_RESULTS);
    const signal = new AbortController().signal;

    await expect(
      searchWorkspaceText({
        wsPaths: ['ws:a.md'],
        recentWsPaths: [],
        query: 'needle',
        signal,
        readText: async () => exactlyAtLimit,
      }),
    ).resolves.toMatchObject({
      matches: { length: MAX_TEXT_SEARCH_RESULTS },
      truncated: false,
    });

    await expect(
      searchWorkspaceText({
        wsPaths: ['ws:a.md', 'ws:b.md'],
        recentWsPaths: [],
        query: 'needle',
        signal,
        readText: async () => exactlyAtLimit,
      }),
    ).resolves.toMatchObject({
      matches: { length: MAX_TEXT_SEARCH_RESULTS },
      truncated: true,
    });
  });
});
