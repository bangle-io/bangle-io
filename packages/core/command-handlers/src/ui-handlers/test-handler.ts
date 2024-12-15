import { expectType } from '@bangle.io/base-utils';
import { c, getCtx } from '../helper';

export const testHandlers = [
  c(
    'command::ui:test-no-use',
    ({ workspaceOps }, { workspaceType, wsName }, key) => {
      const ctx = getCtx(key);

      expectType<string, typeof workspaceType>(workspaceType);
      expectType<string, typeof workspaceOps.name>(workspaceOps.name);
      expectType<string, typeof wsName>(wsName);
      expectType<{ key: 'command::ui:test-no-use' }, typeof key>(key);
    },
  ),
];
