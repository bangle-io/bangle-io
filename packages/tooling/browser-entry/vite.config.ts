import { ThemeManager } from '@bangle.io/color-scheme-manager';
import getEnvVars from '@bangle.io/env-vars';
import { sentryVitePlugin } from '@sentry/vite-plugin';
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
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: 'self-zf',
        project: 'bangle-v2',
      }),
      react(),
    ],
    define: {
      ...envVars.globalIdentifiers,
    },
  };
});
