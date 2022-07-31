import type { FinalConfig } from '@bangle.io/config-template';
import { BangleConfig } from '@bangle.io/config-template';

export const compileConfig = (): FinalConfig => {
  let finalConfig: FinalConfig | undefined;

  try {
    let transientConfig = BangleConfig.fromJSONString(
      // eslint-disable-next-line no-process-env
      process.env.__BANGLE_BUILD_TIME_CONFIG__!,
    );

    finalConfig = transientConfig.finalize();
  } catch (error) {
    console.error(error);
  }

  if (!finalConfig) {
    throw new Error('FinalConfig is not defined');
  }

  return finalConfig;
};
