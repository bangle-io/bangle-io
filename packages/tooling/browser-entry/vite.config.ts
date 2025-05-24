import { ThemeManager } from '@bangle.io/color-scheme-manager/src/index';
import getEnvVars from '@bangle.io/env-vars';
import { languages } from '@bangle.io/translations';
import { sentryVitePlugin } from '@sentry/vite-plugin';
// @ts-ignore - moduleResolution error
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

// Custom serializer to handle functions
function serializeTranslationObjection(obj: any): string {
  const parts: string[] = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const serializedKey = JSON.stringify(key);
      let serializedValue: string;
      if (typeof value === 'function') {
        serializedValue = value.toString(); // Convert function to string
      } else if (typeof value === 'object' && value !== null) {
        serializedValue = serializeTranslationObjection(value);
      } else if (typeof value === 'string') {
        serializedValue = JSON.stringify(value); // Use JSON.stringify for strings
      } else {
        throw new Error(
          `serializeTranslationObjection: Unsupported type encountered during serialization: ${typeof value} for key ${serializedKey}`,
        );
      }
      parts.push(`${serializedKey}: ${serializedValue}`);
    }
  }
  return `{${parts.join(',')}}`;
}

export default defineConfig(async (env) => {
  const isProduction = env.mode === 'production';
  const themeInline = ThemeManager.getInlineScript();

  const translationInline = `(() => {
    const translations = ${serializeTranslationObjection(languages)};
    const userLang = navigator.language.split('-')[0];
    if (translations.hasOwnProperty(userLang)) {
      window.t = translations[userLang].t;
    } else {
      window.t = translations.en.t
    }
  })()`;

  const envVars = getEnvVars({
    isProduction: isProduction,
    isVite: true,
    helpDocsVersion: '0.0.0',
    inlinedScripts: [translationInline, themeInline].join('\n'),
  });

  return {
    build: {
      sourcemap: true,
    },
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
      tailwindcss(),
      react(),
    ],
    define: {
      ...envVars.globalIdentifiers,
    },
  };
});
