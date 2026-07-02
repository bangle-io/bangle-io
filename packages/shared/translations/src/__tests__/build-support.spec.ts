import { describe, expect, test } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  getLanguageScriptSource,
  getTranslationBootstrapScript,
  LOCALE_APPLY_GLOBAL,
  SUPPORTED_LANGUAGES,
  serializeTranslations,
} from '../build-support';
import type { Translations } from '../types';

interface FakeWindow {
  t?: Translations;
  [LOCALE_APPLY_GLOBAL]?: (data: unknown) => void;
}

/** Parse the language code out of a `document.write`n locale script tag. */
function localeFromWrite(chunk: string): string | null {
  const match = chunk.match(/\/locales\/([^.]+)\.js/);
  return match ? (match[1] ?? null) : null;
}

/**
 * Run the inline bootstrap against a faked browser and return the locale
 * languages it requested (in order) plus the window it installed the
 * apply-helper onto.
 */
function boot(navigatorLanguage: string): {
  win: FakeWindow;
  loaded: string[];
} {
  const bootstrap = getTranslationBootstrapScript({
    supported: SUPPORTED_LANGUAGES,
    version: '1.0.0+abc',
  });
  const win: FakeWindow = {};
  const writes: string[] = [];
  const documentStub = {
    write: (chunk: string) => {
      writes.push(chunk);
    },
  };
  const navigator = { language: navigatorLanguage };
  new Function('window', 'navigator', 'document', bootstrap)(
    win,
    navigator,
    documentStub,
  );
  const loaded = writes
    .map(localeFromWrite)
    .filter((lang): lang is string => lang !== null);
  return { win, loaded };
}

/** Simulate the browser executing the emitted `/locales/<lang>.js` scripts. */
function applyLocales(win: FakeWindow, langs: string[]): void {
  for (const lang of langs) {
    new Function('window', getLanguageScriptSource(lang))(win);
  }
}

describe('SUPPORTED_LANGUAGES', () => {
  test('always contains the default language', () => {
    expect(SUPPORTED_LANGUAGES).toContain(DEFAULT_LANGUAGE);
  });

  test('contains the bundled languages', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(expect.arrayContaining(['en', 'de']));
  });
});

describe('serializeTranslations', () => {
  test('encodes strings, nested objects, and functions', () => {
    const source = serializeTranslations({
      a: 'hello "world"',
      nested: { b: 'x' },
      fn: ({ name }: { name: string }) => `Hi ${name}`,
    });
    const value = new Function(`return (${source})`)() as {
      a: string;
      nested: { b: string };
      fn: (arg: { name: string }) => string;
    };
    expect(value.a).toBe('hello "world"');
    expect(value.nested.b).toBe('x');
    expect(value.fn({ name: 'Ada' })).toBe('Hi Ada');
  });

  test('throws on unsupported value types', () => {
    expect(() => serializeTranslations({ n: 1 })).toThrow(/unsupported/);
    expect(() => serializeTranslations(undefined)).toThrow(/unsupported/);
  });
});

describe('getLanguageScriptSource', () => {
  test('applies the selected language to the global t', () => {
    const { win, loaded } = boot('de-DE');
    applyLocales(win, loaded);
    expect(win.t?.meta.lang).toBe('Deutsch');
    expect(win.t?.app.common.newNote).toBe('Neue Notiz');
  });

  test('preserves interpolation callbacks', () => {
    const { win } = boot('en-US');
    applyLocales(win, ['en']);
    expect(win.t?.meta.lang).toBe('English');
    expect(win.t?.meta.testCallback({ name: 'Ada' })).toBe('Hello Ada');
  });

  test('routes through the locale-apply global', () => {
    expect(getLanguageScriptSource('en')).toContain(
      `window.${LOCALE_APPLY_GLOBAL}(`,
    );
  });

  test('throws for an unknown language', () => {
    expect(() => getLanguageScriptSource('xx')).toThrow(/unknown language/);
  });
});

describe('getTranslationBootstrapScript', () => {
  test('English visitors download only the English bundle', () => {
    expect(boot('en-US').loaded).toEqual(['en']);
  });

  test('always loads English first, then the visitor language', () => {
    expect(boot('de-DE').loaded).toEqual(['en', 'de']);
  });

  test('falls back to English for an unsupported language', () => {
    expect(boot('fr-FR').loaded).toEqual(['en']);
  });

  test('uses only the primary subtag to pick the language', () => {
    expect(boot('de-AT').loaded).toEqual(['en', 'de']);
  });

  test('deep-merges the language over English, keeping untranslated keys', () => {
    const { win } = boot('de-DE');
    const apply = win[LOCALE_APPLY_GLOBAL];
    expect(apply).toBeTypeOf('function');
    // English base, then a partial language that translates only one leaf.
    apply?.({
      meta: { lang: 'English' },
      section: { keep: 'english-keep', change: 'english-change' },
    });
    apply?.({
      meta: { lang: 'Deutsch' },
      section: { change: 'deutsch-change' },
    });
    const t = win.t as unknown as {
      meta: { lang: string };
      section: { keep: string; change: string };
    };
    expect(t.meta.lang).toBe('Deutsch');
    expect(t.section.change).toBe('deutsch-change');
    // Untranslated key falls back to the English base rather than vanishing.
    expect(t.section.keep).toBe('english-keep');
  });

  test('does not emit a raw closing script tag that would break parsing', () => {
    const script = getTranslationBootstrapScript({
      supported: ['en', 'de'],
      version: '1.0.0+abc',
    });
    expect(script).not.toContain('</script>');
    expect(script).toContain('<\\/script>');
  });

  test('cache-busts locale URLs with the encoded version', () => {
    let written = '';
    const script = getTranslationBootstrapScript({
      supported: ['en'],
      version: '1.0.0+abc',
    });
    new Function('window', 'navigator', 'document', script)(
      {},
      { language: 'en' },
      {
        write: (chunk: string) => {
          written += chunk;
        },
      },
    );
    expect(written).toBe(
      '<script src="/locales/en.js?v=1.0.0%2Babc"></script>',
    );
  });
});
