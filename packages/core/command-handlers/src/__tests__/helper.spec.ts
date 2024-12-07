import { expectType } from '@bangle.io/base-utils';
import type { WorkspaceOpsService } from '@bangle.io/service-core';
import { describe, expect, test } from 'vitest';
import { c, getCtx } from '../helper';

describe('c helper ', () => {
  test('dependencies type check', () => {
    const result = c(
      'command::ui:test-no-use',
      ({ workspaceOps }, args, key) => {
        const { dispatch } = getCtx(key);

        expectType<
          { readonly workspaceType: string; readonly wsName: string },
          typeof args
        >(args);

        expectType<WorkspaceOpsService, typeof workspaceOps>(workspaceOps);

        dispatch(
          // @ts-expect-error invalid command id
          'command::ui:invalid-not-found',
          {},
        );

        dispatch('command::ws:go-workspace', {
          wsName: 'test',
        });

        dispatch('command::ws:go-workspace', {
          // @ts-expect-error since wsName is required
          wsName: undefined,
        });

        dispatch('command::ws:go-workspace', {
          wsName: 'test',
          // @ts-expect-error extra arg
          extraArg: 'test',
        });

        // should work
        dispatch('command::ui:delete-note-dialog', {
          wsPath: 'test',
        });

        dispatch('command::ui:delete-note-dialog', {
          wsPath: undefined,
        });

        dispatch('command::ui:create-note-dialog', {
          prefillName: 'test',
        });

        dispatch(
          'command::ui:create-note-dialog',
          // @ts-expect-error missing args
          {},
        );

        dispatch('command::ui:create-note-dialog', {
          // @ts-expect-error invalid type
          prefillName: false,
        });

        dispatch('command::ui:create-note-dialog', {
          prefillName: undefined,
        });
      },
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "handler": [Function],
        "id": "command::ui:test-no-use",
      }
    `);
  });
});
