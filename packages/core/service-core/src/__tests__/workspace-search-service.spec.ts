import { createTestEnvironment } from '@bangle.io/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSavedMarkdownSnippet,
  findSavedMarkdownLineMatches,
  WORKSPACE_SEARCH_SNIPPET_MAX_LENGTH,
} from '../workspace-search-service';

const controllers: AbortController[] = [];

function createController(): AbortController {
  const controller = new AbortController();
  controllers.push(controller);
  return controller;
}

async function createSearchSetup() {
  const controller = createController();
  const testEnv = createTestEnvironment({ controller });
  const services = testEnv.instantiateAll();
  await testEnv.mountAll();
  return { controller, services };
}

function createSizedFile(contents: string, name: string): File {
  const file = new File([contents], name);
  Object.defineProperty(file, 'size', {
    configurable: true,
    value: new Blob([contents]).size,
  });
  return file;
}

afterEach(() => {
  for (const controller of controllers.splice(0)) {
    controller.abort();
  }
  vi.restoreAllMocks();
});

describe('saved Markdown line matching', () => {
  it('matches case-insensitive literal text once per source line', () => {
    expect(
      findSavedMarkdownLineMatches(
        '# NEEDLE\r\nplain\nneedle and NEEDLE\rregex .* text',
        'needle',
      ),
    ).toEqual([
      { lineNumber: 1, snippet: '# NEEDLE' },
      { lineNumber: 3, snippet: 'needle and NEEDLE' },
    ]);

    expect(findSavedMarkdownLineMatches('before .* after', '.*')).toEqual([
      { lineNumber: 1, snippet: 'before .* after' },
    ]);
  });

  it('keeps a match visible in a deterministic bounded raw-source excerpt', () => {
    const line = `${'a'.repeat(400)}NEEDLE${'z'.repeat(400)}`;
    const snippet = createSavedMarkdownSnippet(line, 400, 'NEEDLE'.length);

    expect(snippet).toContain('NEEDLE');
    expect(snippet).toHaveLength(WORKSPACE_SEARCH_SNIPPET_MAX_LENGTH);
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });
});

describe('WorkspaceSearchService', () => {
  it('searches only one workspace and returns deterministically grouped lines', async () => {
    const { controller, services } = await createSearchSetup();
    const listSpy = vi
      .spyOn(services.fileSystem, 'listNoteFiles')
      .mockResolvedValue(['search-ws:z-last.md', 'search-ws:a-first.md']);
    vi.spyOn(services.fileSystem, 'getMaxFileSizeBytes').mockResolvedValue(
      1000,
    );
    vi.spyOn(services.fileSystem, 'readFile').mockImplementation(
      async (wsPath) =>
        wsPath.endsWith('a-first.md')
          ? createSizedFile('NEEDLE one\nnone\nneedle two', 'a-first.md')
          : createSizedFile('first\nNeedle in **Markdown**', 'z-last.md'),
    );

    const result = await services.workspaceSearch.searchSavedMarkdown({
      limit: 100,
      query: 'needle',
      signal: controller.signal,
      wsName: 'search-ws',
    });

    expect(result).toEqual({
      groups: [
        {
          matches: [
            { lineNumber: 1, snippet: 'NEEDLE one' },
            { lineNumber: 3, snippet: 'needle two' },
          ],
          wsPath: 'search-ws:a-first.md',
        },
        {
          matches: [{ lineNumber: 2, snippet: 'Needle in **Markdown**' }],
          wsPath: 'search-ws:z-last.md',
        },
      ],
      skipped: { oversizedWsPaths: [], unreadableWsPaths: [] },
      truncated: false,
    });
    expect(listSpy).toHaveBeenCalledWith('search-ws', controller.signal);
  });

  it('caps matching lines globally and reports truncation', async () => {
    const { controller, services } = await createSearchSetup();
    vi.spyOn(services.fileSystem, 'listNoteFiles').mockResolvedValue([
      'search-ws:b.md',
      'search-ws:a.md',
    ]);
    vi.spyOn(services.fileSystem, 'getMaxFileSizeBytes').mockResolvedValue(
      1000,
    );
    vi.spyOn(services.fileSystem, 'readFile').mockImplementation(
      async (wsPath) =>
        wsPath.endsWith('a.md')
          ? createSizedFile('hit a1\nhit a2', 'a.md')
          : createSizedFile('hit b1\nhit b2', 'b.md'),
    );

    const result = await services.workspaceSearch.searchSavedMarkdown({
      limit: 3,
      query: 'hit',
      signal: controller.signal,
      wsName: 'search-ws',
    });

    expect(result.groups).toEqual([
      {
        matches: [
          { lineNumber: 1, snippet: 'hit a1' },
          { lineNumber: 2, snippet: 'hit a2' },
        ],
        wsPath: 'search-ws:a.md',
      },
      {
        matches: [{ lineNumber: 1, snippet: 'hit b1' }],
        wsPath: 'search-ws:b.md',
      },
    ]);
    expect(result.truncated).toBe(true);
  });

  it('reports unreadable and oversized notes without converting oversized content', async () => {
    const { controller, services } = await createSearchSetup();
    const oversizedFile = createSizedFile('needle', 'large.md');
    const textSpy = vi.spyOn(oversizedFile, 'text');
    vi.spyOn(services.fileSystem, 'listNoteFiles').mockResolvedValue([
      'search-ws:large.md',
      'search-ws:missing.md',
      'search-ws:ok.md',
    ]);
    vi.spyOn(services.fileSystem, 'getMaxFileSizeBytes').mockImplementation(
      async (wsPath) => (wsPath.endsWith('large.md') ? 1 : 1000),
    );
    vi.spyOn(services.fileSystem, 'readFile').mockImplementation(
      async (wsPath) => {
        if (wsPath.endsWith('large.md')) {
          return oversizedFile;
        }
        if (wsPath.endsWith('missing.md')) {
          throw new Error('permission lost');
        }
        return createSizedFile('needle', 'ok.md');
      },
    );

    const result = await services.workspaceSearch.searchSavedMarkdown({
      limit: 100,
      query: 'needle',
      signal: controller.signal,
      wsName: 'search-ws',
    });

    expect(result.groups).toEqual([
      {
        matches: [{ lineNumber: 1, snippet: 'needle' }],
        wsPath: 'search-ws:ok.md',
      },
    ]);
    expect(result.skipped).toEqual({
      oversizedWsPaths: ['search-ws:large.md'],
      unreadableWsPaths: ['search-ws:missing.md'],
    });
    expect(textSpy).not.toHaveBeenCalled();
  });

  it('uses at most four concurrent readers', async () => {
    const { controller, services } = await createSearchSetup();
    const paths = Array.from(
      { length: 9 },
      (_, index) => `search-ws:${index}.md`,
    );
    let activeReads = 0;
    let maxActiveReads = 0;
    vi.spyOn(services.fileSystem, 'listNoteFiles').mockResolvedValue(paths);
    vi.spyOn(services.fileSystem, 'getMaxFileSizeBytes').mockResolvedValue(
      1000,
    );
    vi.spyOn(services.fileSystem, 'readFile').mockImplementation(async () => {
      activeReads += 1;
      maxActiveReads = Math.max(maxActiveReads, activeReads);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeReads -= 1;
      return createSizedFile('needle', 'note.md');
    });

    await services.workspaceSearch.searchSavedMarkdown({
      limit: 100,
      query: 'needle',
      signal: controller.signal,
      wsName: 'search-ws',
    });

    expect(maxActiveReads).toBe(4);
  });

  it('propagates listing failures and aborts instead of reporting partial results', async () => {
    const { controller, services } = await createSearchSetup();
    const listError = new Error('workspace unavailable');
    vi.spyOn(services.fileSystem, 'listNoteFiles').mockRejectedValue(listError);

    await expect(
      services.workspaceSearch.searchSavedMarkdown({
        limit: 100,
        query: 'needle',
        signal: controller.signal,
        wsName: 'search-ws',
      }),
    ).rejects.toBe(listError);

    controller.abort();
    await expect(
      services.workspaceSearch.searchSavedMarkdown({
        limit: 100,
        query: 'needle',
        signal: controller.signal,
        wsName: 'search-ws',
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
