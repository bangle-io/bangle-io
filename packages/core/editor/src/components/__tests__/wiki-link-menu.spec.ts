import { WsPath } from '@bangle.io/ws-path';
import { describe, expect, it } from 'vitest';
import { buildWikiLinkOptions, clampWikiOptionIndex } from '../wiki-link-menu';

function record({
  path,
  searchText,
  target,
}: {
  path: string;
  searchText: string;
  target: string;
}) {
  return {
    searchText,
    target,
    wsPath: WsPath.assertFile(path),
  };
}

describe('buildWikiLinkOptions', () => {
  it('offers an unresolved wiki link while the workspace index is unavailable', () => {
    expect(
      buildWikiLinkOptions({
        query: 'Some Note',
        searchRecords: undefined,
      }),
    ).toEqual([
      {
        attrs: { target: 'Some Note', label: null },
        query: 'Some Note',
      },
    ]);
  });

  it('filters out the note that owns the active wiki-link menu', () => {
    const home = WsPath.assertFile('notes:Home.md');
    const target = WsPath.assertFile('notes:Target.md');

    expect(
      buildWikiLinkOptions({
        excludeWsPath: home.wsPath,
        query: 'Ho',
        searchRecords: [
          {
            searchText: 'Home Home.md',
            target: 'Home',
            wsPath: home,
          },
          {
            searchText: 'Target Target.md',
            target: 'Target',
            wsPath: target,
          },
        ],
      }),
    ).toEqual([
      {
        attrs: { target: 'Ho', label: null },
        query: 'Ho',
      },
    ]);
  });

  it('keeps aliases, removes duplicate search records, and pins unresolved creation last', () => {
    const options = buildWikiLinkOptions({
      query: 'project',
      searchRecords: [
        record({
          path: 'notes:projects/Roadmap.md',
          searchText: 'Roadmap project plan',
          target: '/projects/Roadmap',
        }),
        record({
          path: 'notes:archive/Roadmap.md',
          searchText: 'Roadmap project plan',
          target: '/archive/Roadmap',
        }),
      ],
    });

    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({
      attrs: { target: '/archive/Roadmap', label: null },
    });
    expect(options[1]).toEqual({
      attrs: { target: 'project', label: null },
      query: 'project',
    });
  });

  it('bounds a large result set while retaining the unresolved option at the end', () => {
    const options = buildWikiLinkOptions({
      query: 'Note',
      searchRecords: Array.from({ length: 1_000 }, (_, index) =>
        record({
          path: `notes:generated/Note${String(index).padStart(4, '0')}.md`,
          searchText: `Note${String(index).padStart(4, '0')}`,
          target: `/generated/Note${String(index).padStart(4, '0')}`,
        }),
      ),
    });

    expect(options).toHaveLength(12);
    expect(options.at(-1)).toEqual({
      attrs: { target: 'Note', label: null },
      query: 'Note',
    });
    expect(options.slice(0, -1).every((option) => option.path)).toBe(true);
  });

  it('does not offer an invalid unresolved target and clamps a stale selected index', () => {
    const options = buildWikiLinkOptions({
      query: 'bad[target',
      searchRecords: [],
    });

    expect(options).toEqual([]);
    expect(clampWikiOptionIndex(undefined, 3)).toBe(0);
    expect(clampWikiOptionIndex(-1, 3)).toBe(0);
    expect(clampWikiOptionIndex(1, 3)).toBe(1);
    expect(clampWikiOptionIndex(99, 3)).toBe(2);
    expect(clampWikiOptionIndex(99, 0)).toBe(0);
  });
});
