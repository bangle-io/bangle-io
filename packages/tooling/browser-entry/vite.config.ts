import { ThemeManager } from '@bangle.io/color-scheme-manager';
import getEnvVars from '@bangle.io/env-vars';
import react from '@vitejs/plugin-react';

import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

// https://vitejs.dev/config/
export default defineConfig(async (env) => {
  const isProduction = env.mode === 'production';
  const themeInline = ThemeManager.getInlineScript();

  const envVars = getEnvVars({
    isProduction: isProduction,
    isVite: true,
    helpDocsVersion: '0.0.0',
    inlinedScripts: themeInline,
  });

  return {
    plugins: [
      createHtmlPlugin({
        minify: isProduction,
        inject: {
          data: { ...envVars.htmlInjections },
        },
      }),
      react(),
    ],
    define: {
      ...envVars.globalIdentifiers,
    },
  };
});
