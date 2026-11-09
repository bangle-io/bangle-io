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
import { getPwaManifestBuildOrigin, pwaManifestPlugin } from './pwa-manifest';
import { translationsPlugin } from './translations-plugin';

// The bootstrap must be built before `getEnvVars` (it is one of the
// `inlinedScripts`), but the cache-busting `releaseId` is one of that call's
// outputs. So the bootstrap ships a placeholder that is swapped for the real
// release once it is known.
const LOCALE_VERSION_PLACEHOLDER = '__BANGLE_LOCALE_VERSION__';
const MIN_DEV_PORT = 3000;
const MAX_PORT = 65_535;

/** Escape a value for safe substitution inside a double-quoted JS string literal. */
function jsStringInner(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function readPortEnv(name: string): number | undefined {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return undefined;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < MIN_DEV_PORT || port > MAX_PORT) {
    throw new Error(
      `${name} must be an integer port from ${MIN_DEV_PORT} to ${MAX_PORT}.`,
    );
  }

  return port;
}

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
  const pwaManifestBuildOrigin = getPwaManifestBuildOrigin({
    appEnv: envVars.appEnv,
    cloudflarePagesUrl: process.env.CF_PAGES_URL,
    isCloudflarePagesBuild: process.env.CF_PAGES === '1',
  });

  // The placeholder sits inside a JS string literal, so escape the release
  // before splicing it in.
  envVars.htmlInjections.inlinedScripts =
    envVars.htmlInjections.inlinedScripts.replaceAll(
      LOCALE_VERSION_PLACEHOLDER,
      jsStringInner(envVars.releaseId),
    );

  return {
    build: {
      sourcemap: true,
    },
    server: {
      port: readPortEnv('BANGLE_DEV_PORT'),
    },
    preview: {
      port: readPortEnv('BANGLE_PREVIEW_PORT'),
    },
    plugins: [
      pwaManifestPlugin(pwaManifestBuildOrigin),
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
