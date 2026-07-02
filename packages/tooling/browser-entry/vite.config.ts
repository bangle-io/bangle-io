import { ThemeManager } from '@bangle.io/color-scheme-manager';
import getEnvVars from '@bangle.io/env-vars';
import {
  getTranslationBootstrapScript,
  SUPPORTED_LANGUAGES,
} from '@bangle.io/translations';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import { translationsPlugin } from './translations-plugin';

// Replaced after env vars are resolved so the locale URL is cache-busted per
// release. Using a placeholder avoids computing `releaseId` twice.
const LOCALE_VERSION_PLACEHOLDER = '__BANGLE_LOCALE_VERSION__';

export default defineConfig(async (env) => {
  const isProduction = env.mode === 'production';
  const themeInline = ThemeManager.getInlineScript();

  // Only the visitor's language is downloaded (as a standalone
  // `/locales/<lang>.js` asset emitted by `translationsPlugin`), while `t`
  // stays synchronously available before the app bundle runs.
  const translationInline = getTranslationBootstrapScript({
    supported: SUPPORTED_LANGUAGES,
    version: LOCALE_VERSION_PLACEHOLDER,
  });

  const envVars = getEnvVars({
    isProduction: isProduction,
    helpDocsVersion: '0.0.0',
    inlinedScripts: [translationInline, themeInline],
  });

  envVars.htmlInjections.inlinedScripts =
    envVars.htmlInjections.inlinedScripts.replaceAll(
      LOCALE_VERSION_PLACEHOLDER,
      envVars.releaseId,
    );

  return {
    build: {
      sourcemap: true,
    },
    plugins: [
      translationsPlugin(),
      createHtmlPlugin({
        minify: isProduction,
        inject: {
          data: { ...envVars.htmlInjections },
        },
      }),
      tailwindcss(),
      react(),
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: 'self-zf',
        project: 'bangle-v2',
        release: {
          name: envVars.releaseId,
        },
        sourcemaps: {
          filesToDeleteAfterUpload: ['dist/**/*.map'],
        },
      }),
    ],
    define: {
      ...envVars.globalIdentifiers,
    },
  };
});
