import type { FinalConfig } from '@bangle.io/config-template';
import { BangleConfig } from '@bangle.io/config-template';

export const compileConfig = (): FinalConfig => {
  let finalConfig: FinalConfig | undefined;

  try {
    let transientConfig = BangleConfig.fromJSONString(
      // eslint-disable-next-line no-process-env
      process.env.__BANGLE_BUILD_TIME_CONFIG__!,
    );

    const isTest = transientConfig.build.nodeEnv === 'test';

    try {
      // the e2e test runner will replace the following with the injected configuration.
      let rawInjectedConfig = globalThis.__BANGLE_INJECTED_CONFIG__ || null;

      if (rawInjectedConfig) {
        console.warn('injecting config!');
        const injectedConfig = BangleConfig.fromJSONString(rawInjectedConfig);
        !isTest && injectedConfig.print('injected-config');
        transientConfig = transientConfig.merge(
          BangleConfig.fromJSONString(rawInjectedConfig),
        );
      }
    } catch (error) {
      console.error(error);
    }

    !isTest && transientConfig.print();
    finalConfig = transientConfig.finalize();
  } catch (error) {
    console.error(error);
  }

  if (!finalConfig) {
    throw new Error('FinalConfig is not defined');
  }

  if (finalConfig.debug) {
    console.warn('FinalConfig: is using debug fields!');
  }

  return finalConfig;
};
