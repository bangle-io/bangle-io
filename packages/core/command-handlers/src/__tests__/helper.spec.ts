import { expectType } from '@bangle.io/base-utils';
import type { WorkspaceOpsService } from '@bangle.io/service-core';
import { describe, expect, test } from 'vitest';
import { c, getCtx } from '../helper';

describe('c helper ', () => {
  test('dependencies type check', () => {
    const result = c(
      'command::ui:native-fs-auth',
      ({ workspaceOps }, args, key) => {
        const { dispatch } = getCtx(key);

        expectType<{ readonly wsName: string }, typeof args>(args);

        expectType<WorkspaceOpsService, typeof workspaceOps>(workspaceOps);
        expectType<{ key: 'command::ui:native-fs-auth' }, typeof key>(key);

        dispatch(
          // @ts-expect-error invalid command id
          'command::ui:invalid-not-found',
          {},
        );
      },
    );
    const childDispatchResult = c(
      'command::ui:delete-workspace-dialog',
      (_services, args, key) => {
        const { dispatch } = getCtx(key);

        expectType<null, typeof args>(args);
        dispatch('command::ws:delete-workspace', { wsName: 'test' });
        dispatch('command::ws:delete-workspace', {
          // @ts-expect-error wsName is required
          wsName: undefined,
        });
        dispatch('command::ws:delete-workspace', {
          wsName: 'test',
          // @ts-expect-error extra args are rejected
          extraArg: 'test',
        });
        dispatch(
          // @ts-expect-error undeclared child commands are rejected
          'command::ui:focus-editor',
          null,
        );
      },
    );

    expect(childDispatchResult.id).toBe('command::ui:delete-workspace-dialog');
    expect(result).toMatchInlineSnapshot(`
      {
        "handler": [Function],
        "id": "command::ui:native-fs-auth",
      }
    `);
  });
});
