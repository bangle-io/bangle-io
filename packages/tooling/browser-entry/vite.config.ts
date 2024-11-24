import getEnvVars from '@bangle.io/env-vars';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig((env) => {
  const isProduction = env.mode === 'production';

  const envVars = getEnvVars({
    isProduction: isProduction,
    isVite: true,
    helpDocsVersion: '0.0.0',
  });

  return {
    plugins: [react()],
    define: {
      ...envVars.globalIdentifiers,
    },
  };
});
