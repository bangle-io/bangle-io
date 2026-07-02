/**
 * Build-time helpers for shipping translations to the browser.
 *
 * These are consumed by the Vite build (bootstrap + per-language asset
 * emission) and are never part of the running application bundle. They serialize
 * each language into a standalone classic script so a visitor downloads only the
 * single language they need, while `t` stays synchronously available before app
 * code runs.
 *
 * The serializer intentionally supports plain objects, strings, and functions
 * (interpolation callbacks). Functions are emitted via `Function.prototype.toString`,
 * so - as documented in `languages/en.ts` - they must not close over any imports
 * or outer bindings.
 */
import * as languages from './languages';

interface LanguageModule {
  t: unknown;
}

const LANGUAGE_MAP: Record<string, LanguageModule> = languages;

/**
 * The default language every build must contain. It is the source of truth for
 * the `Translations` shape and the fallback when a visitor's language is not
 * supported.
 */
export const DEFAULT_LANGUAGE = 'en';

/**
 * Language codes with a bundled translation, e.g. `['de', 'en']`. Always
 * includes {@link DEFAULT_LANGUAGE}.
 */
export const SUPPORTED_LANGUAGES: readonly string[] = Object.keys(LANGUAGE_MAP);

/**
 * Serialize a translation value into an executable JavaScript literal. Strings
 * use JSON encoding, nested objects recurse, and functions are stringified.
 */
export function serializeTranslations(value: unknown): string {
  if (typeof value === 'function') {
    return value.toString();
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'object' && value !== null) {
    const parts: string[] = [];
    for (const [key, child] of Object.entries(value)) {
      parts.push(`${JSON.stringify(key)}:${serializeTranslations(child)}`);
    }
    return `{${parts.join(',')}}`;
  }
  throw new Error(
    `serializeTranslations: unsupported value of type "${typeof value}"`,
  );
}

/**
 * Global function - installed by the bootstrap - that each locale script calls
 * to apply its data. Non-default languages deep-merge over the English base, so
 * any untranslated key falls back to English instead of becoming `undefined`.
 */
export const LOCALE_APPLY_GLOBAL = '__bangleApplyLocale';

/**
 * Build the source of a standalone classic script that applies the given
 * language to the global `t` (via {@link LOCALE_APPLY_GLOBAL}). This is what
 * each `/locales/<lang>.js` asset contains. Loaded after the English base, its
 * data is deep-merged on top; loaded as the base, it becomes `t` directly.
 */
export function getLanguageScriptSource(lang: string): string {
  const mod = LANGUAGE_MAP[lang];
  if (!mod) {
    throw new Error(`getLanguageScriptSource: unknown language "${lang}"`);
  }
  return `window.${LOCALE_APPLY_GLOBAL}(${serializeTranslations(mod.t)});`;
}

interface BootstrapOptions {
  /** Language codes that have a `/locales/<lang>.js` asset. */
  supported: readonly string[];
  /** Cache-busting token appended as `?v=` to the locale URL. */
  version: string;
}

/**
 * Build the inline `<head>` bootstrap. It installs the locale-apply helper,
 * then synchronously loads (via `document.write`, so `t` is defined before the
 * module bundle runs) the English base plus - when the visitor's language
 * differs - their language, whose keys deep-merge over English.
 *
 * English ({@link DEFAULT_LANGUAGE}) is always loaded as the fallback. An
 * English visitor downloads exactly one bundle; others download English plus
 * their language, never every translation.
 *
 * INVARIANT: the returned script must be injected as a synchronous, inline
 * `<head>` script (never `async`/`defer`). Its `document.write` of the locale
 * `<script>` tags relies on running during initial parsing; deferring it would
 * blank the page and leave `t` undefined.
 */
export function getTranslationBootstrapScript({
  supported,
  version,
}: BootstrapOptions): string {
  const supportedLiteral = JSON.stringify(supported);
  const fallbackLiteral = JSON.stringify(DEFAULT_LANGUAGE);
  const versionLiteral = JSON.stringify(version);
  const applyGlobal = LOCALE_APPLY_GLOBAL;
  // `<\/script>` keeps the HTML parser from closing the inline bootstrap early.
  return `(function(){
  var supported=${supportedLiteral};
  var fallback=${fallbackLiteral};
  var version=${versionLiteral};
  var hasOwn=Object.prototype.hasOwnProperty;
  function isObject(value){return value&&typeof value==="object"&&!Array.isArray(value);}
  function deepMerge(base,override){
    for(var key in override){
      if(!hasOwn.call(override,key)||key==="__proto__"){continue;}
      base[key]=isObject(base[key])&&isObject(override[key])?deepMerge(base[key],override[key]):override[key];
    }
    return base;
  }
  window.${applyGlobal}=function(data){
    window.t=window.t?deepMerge(window.t,data):data;
  };
  function load(lang){
    document.write('<script src="/locales/'+lang+'.js?v='+encodeURIComponent(version)+'"><\\/script>');
  }
  var preferred=((navigator.language||"")+"").split("-")[0];
  var chosen=supported.indexOf(preferred)!==-1?preferred:fallback;
  load(fallback);
  if(chosen!==fallback){load(chosen);}
})();`;
}
