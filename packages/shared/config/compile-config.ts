import type { FinalConfig } from '@bangle.io/config-template';
import { BangleConfig } from '@bangle.io/config-template';

export const compileConfig = (): FinalConfig => {
  let finalConfig: FinalConfig | undefined;

  try {
    // eslint-disable-next-line no-undef
    const buildTimeConfig = getBuildTimeConfig();

    if (!buildTimeConfig) {
      throw new Error('buildTimeConfig is not defined');
    }

    let transientConfig = BangleConfig.fromJSONString(buildTimeConfig);

    const isTest = transientConfig.build.nodeEnv === 'test';

    try {
      // the e2e test runner will replace the following with the injected configuration.
      // eslint-disable-next-line no-undef, @typescript-eslint/prefer-nullish-coalescing
      let rawInjectedConfig = __BANGLE_INJECTED_CONFIG__ || null;

      if (rawInjectedConfig) {
        console.warn('injecting config!');
        const injectedConfig = BangleConfig.fromJSONString(rawInjectedConfig);
        !isTest && injectedConfig.print('injected-config');
        transientConfig = transientConfig.merge(
          BangleConfig.fromJSONString(rawInjectedConfig),
        );
      }
    } catch (error) {
      console.debug('No injected config found');
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

function getBuildTimeConfig() {
  try {
    // try to get the build time directly, vite replaces this with real value
    // eslint-disable-next-line no-undef
    return __BANGLE_BUILD_TIME_CONFIG__;
  } catch {
    if (typeof process !== 'undefined') {
      // Jest uses process instead of other
      // eslint-disable-next-line no-undef
      return process.env.__BANGLE_BUILD_TIME_CONFIG__;
    }

    throw new Error('buildTimeConfig is not defined');
  }
}
