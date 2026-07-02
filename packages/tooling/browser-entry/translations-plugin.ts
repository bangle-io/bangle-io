import {
  getLanguageScriptSource,
  SUPPORTED_LANGUAGES,
} from '@bangle.io/translations';
import type { Plugin } from 'vite';

const LOCALE_PREFIX = '/locales/';
const LOCALE_SUFFIX = '.js';

/** Extract the language code from a `/locales/<lang>.js` request path. */
function parseLocaleRequest(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  const pathname = url.split('?')[0] ?? '';
  if (
    !pathname.startsWith(LOCALE_PREFIX) ||
    !pathname.endsWith(LOCALE_SUFFIX)
  ) {
    return null;
  }
  const lang = pathname.slice(LOCALE_PREFIX.length, -LOCALE_SUFFIX.length);
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : null;
}

/**
 * Emits one standalone classic script per language at `/locales/<lang>.js` and
 * serves them in dev. The inline HTML bootstrap (see
 * `getTranslationBootstrapScript`) loads exactly one of these based on the
 * visitor's language, so no bundle ships every translation.
 */
export function translationsPlugin(): Plugin {
  return {
    name: 'bangle-translations',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const lang = parseLocaleRequest(req.url);
        if (!lang) {
          next();
          return;
        }
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.end(getLanguageScriptSource(lang));
      });
    },
    generateBundle() {
      for (const lang of SUPPORTED_LANGUAGES) {
        this.emitFile({
          type: 'asset',
          fileName: `locales/${lang}${LOCALE_SUFFIX}`,
          source: getLanguageScriptSource(lang),
        });
      }
    },
  };
}
