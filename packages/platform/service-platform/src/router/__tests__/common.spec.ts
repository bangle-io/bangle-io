import { TEXT_SEARCH_QUERY_MAX_LENGTH } from '@bangle.io/constants';
import { describe, expect, it } from 'vitest';
import { handleRouteInfo } from '../common';

const RETIRED_ROUTE_IDS = [
  'fatal-error',
  'native-fs-auth-failed',
  'native-fs-auth-req',
  'workspace-not-found',
  'ws-path-not-found',
] as const;

describe('handleRouteInfo', () => {
  it('decodes text search and ignores an invalid preferred note hint', () => {
    expect(
      handleRouteInfo('text-search', {
        wsName: 'notes',
        query: 'C++',
        preferredWsPath: 'another:note.md',
      }),
    ).toEqual({
      route: 'text-search',
      payload: { wsName: 'notes', query: 'C++' },
    });
  });

  it('normalizes text search before preserving it in the route', () => {
    const query = 'x'.repeat(TEXT_SEARCH_QUERY_MAX_LENGTH + 100);

    expect(
      handleRouteInfo('text-search', {
        wsName: 'notes',
        query: `  ${query}  `,
      }),
    ).toEqual({
      route: 'text-search',
      payload: {
        wsName: 'notes',
        query: 'x'.repeat(TEXT_SEARCH_QUERY_MAX_LENGTH),
      },
    });
  });

  it.each(RETIRED_ROUTE_IDS)(
    'decodes retired route "%s" as not-found',
    (route) => {
      expect(handleRouteInfo(route, {})).toEqual({
        route: 'not-found',
        payload: { path: route },
      });
    },
  );
});
