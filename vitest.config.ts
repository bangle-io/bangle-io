import getEnvVars from '@bangle.io/env-vars';
import { defineConfig } from 'vitest/config';
export default defineConfig((env) => {
  const isProduction = env.mode === 'production';

  const envVars = getEnvVars({
    isProduction: isProduction,
    isVite: true,
    helpDocsVersion: '0.0.0',
  });

  return {
    test: {
      globals: true,
      setupFiles: 'vitest-global-setup.js',
      include: ['**/*.{vitest,spec}.?(c|m)[jt]s?(x)'],
      clearMocks: true,
      restoreMocks: true,
    },
    define: {
      ...envVars.globalIdentifiers,
    },
  };
});
