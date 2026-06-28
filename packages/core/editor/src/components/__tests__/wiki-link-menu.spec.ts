import { WsPath } from '@bangle.io/ws-path';
import { describe, expect, it } from 'vitest';
import { buildWikiLinkOptions } from '../wiki-link-menu';

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
});
