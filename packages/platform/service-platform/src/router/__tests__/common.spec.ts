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
  it.each(
    RETIRED_ROUTE_IDS,
  )('decodes retired route "%s" as not-found', (route) => {
    expect(handleRouteInfo(route, {})).toEqual({
      route: 'not-found',
      payload: { path: route },
    });
  });
});
