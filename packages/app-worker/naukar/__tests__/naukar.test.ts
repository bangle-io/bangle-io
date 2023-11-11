import { AppDatabase, NaukarBare } from '@bangle.io/shared-types';

import { Naukar, NaukarConfig } from '../index';

describe('Naukar', () => {
  const setup = (config: Partial<NaukarConfig> = {}) => {
    let naukar = new Naukar({
      eternalVars: {
        debugFlags: {},
        appDatabase: {} as AppDatabase,
      },
      ...config,
    });

    return { naukar };
  };
  it('should create an instance of Naukar', () => {
    let { naukar } = setup();

    // to ensure that NaukarBare is a subset of Record<string, (...args:any[])=>any>
    () => {
      let x: NaukarBare = {} as NaukarBare satisfies Record<
        string,
        (...args: any[]) => any
      >;
    };

    expect(naukar).toBeInstanceOf(Naukar);
  });

  it('ok method should return true', () => {
    let { naukar } = setup();
    expect(naukar.ok()).toBe(true);
  });

  it('getDebugFlags should return debug flags from eternalVars', () => {
    let { naukar } = setup({
      eternalVars: {
        appDatabase: {} as any,
        debugFlags: {
          testDelayWorkerInitialize: 1000,
        },
      },
    });

    expect(naukar.getDebugFlags()).toEqual({
      testDelayWorkerInitialize: 1000,
    });
  });
});
