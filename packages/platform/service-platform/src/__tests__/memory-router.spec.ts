import { makeTestCommonOpts } from '@bangle.io/test-utils';
import type { AppRouteInfo } from '@bangle.io/types';
import { describe, expect, it } from 'vitest';
import { MemoryRouterService } from '../memory-router';

async function setup() {
  const { commonOpts, mockLog, controller } = makeTestCommonOpts();
  const context = {
    ctx: commonOpts,
    serviceContext: {
      abortSignal: commonOpts.rootAbortSignal,
    },
  };

  const service = new MemoryRouterService(context, null);
  await service.mount();

  return {
    service,
    mockLog,
    controller,
  };
}

describe('MemoryRouterService', () => {
  it('should initialize with welcome route', async () => {
    const { service } = await setup();

    expect(service.routeInfo).toEqual({
      route: 'welcome',
      payload: {},
    });
  });

  it('should handle navigation correctly', async () => {
    const { service } = await setup();
    const newRoute: AppRouteInfo = {
      route: 'editor',
      payload: {
        wsPath: 'test-workspace:test.md',
      },
    };

    const events: any[] = [];
    service.emitter.on('event::router:route-update', (event) => {
      events.push(event);
    });

    service.navigate(newRoute);

    expect(service.routeInfo).toEqual(newRoute);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      routeInfo: newRoute,
      state: {},
      kind: 'pushState',
    });
  });

  it('should handle navigation with state', async () => {
    const { service } = await setup();
    const newRoute: AppRouteInfo = {
      route: 'ws-home',
      payload: {
        wsName: 'test-workspace',
      },
    };
    const state = { someState: 'value' };

    const events: any[] = [];
    service.emitter.on('event::router:route-update', (event) => {
      events.push(event);
    });

    service.navigate(newRoute, { state });

    expect(service.routeInfo).toEqual(newRoute);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      routeInfo: newRoute,
      state,
      kind: 'pushState',
    });
  });

  it('should have active lifecycle state', async () => {
    const { service } = await setup();

    expect(service.lifeCycle).toEqual({
      current: 'active',
      previous: undefined,
    });
  });

  it('should handle basePath configuration', async () => {
    const { commonOpts } = makeTestCommonOpts();
    const context = {
      ctx: commonOpts,
      serviceContext: {
        abortSignal: commonOpts.rootAbortSignal,
      },
    };

    const service = new MemoryRouterService(context, null, {
      basePath: '/test',
    });
    await service.mount();

    expect(service.basePath).toBe('/test');
  });

  it('should cleanup emitter on abort', async () => {
    const { service, controller } = await setup();
    const events: any[] = [];

    service.emitter.on('event::router:route-update', (event) => {
      events.push(event);
    });

    controller.abort();

    // After abort, new events should not be received
    const newRoute: AppRouteInfo = {
      route: 'welcome',
      payload: {},
    };
    service.navigate(newRoute);

    expect(events).toHaveLength(0);
  });
});
