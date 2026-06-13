import getEnvVars from '@bangle.io/env-vars';
import { defineConfig } from 'vitest/config';

const NODE_ABORT_ERROR_MESSAGE = 'This operation was aborted';

function isAbortError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    'message' in error &&
    error.name === 'AbortError' &&
    error.message === NODE_ABORT_ERROR_MESSAGE
  );
}

export default defineConfig((env) => {
  const isProduction = env.mode === 'production';

  const envVars = getEnvVars({
    isProduction: isProduction,
    helpDocsVersion: '0.0.0',
  });

  return {
    test: {
      globals: true,
      setupFiles: 'vitest-global-setup.js',
      include: ['**/*.{vitest,spec}.?(c|m)[jt]s?(x)'],
      clearMocks: true,
      restoreMocks: true,
      onUnhandledError: (error: unknown) => {
        if (isAbortError(error)) {
          return false;
        }

        return true;
      },
    },
    define: {
      ...envVars.globalIdentifiers,
    },
  };
});
