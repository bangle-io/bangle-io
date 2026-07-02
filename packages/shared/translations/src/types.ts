import type { t } from './languages/en';

/**
 * The complete translation shape. English (`en`) is the source of truth; every
 * key the app reads exists here.
 */
export type Translations = typeof t;

/**
 * A translation may be authored partially: any subtree can be omitted, and the
 * bootstrap deep-merges it over the English base so untranslated keys fall back
 * to English. Functions (interpolation callbacks) are treated as leaves.
 */
export type PartialTranslations<T = Translations> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? PartialTranslations<T[K]>
      : T[K];
};
