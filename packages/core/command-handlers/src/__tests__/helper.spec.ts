import { expectType } from '@bangle.io/base-utils';
import type { WorkspaceOpsService } from '@bangle.io/service-core';
import { describe, expect, test } from 'vitest';
import { c } from '../helper';

describe('c helper ', () => {
  test('dependencies type check', () => {
    const result = c('command::ui:test-no-use', ({ workspaceOps }) => {
      expectType<WorkspaceOpsService, typeof workspaceOps>(workspaceOps);
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "handler": [Function],
        "id": "command::ui:test-no-use",
      }
    `);
  });
});
