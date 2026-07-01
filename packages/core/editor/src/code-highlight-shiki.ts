import type { Parser } from 'prosemirror-highlight';
import { createParser } from 'prosemirror-highlight/shiki';
import type { HighlighterCore, LanguageRegistration } from 'shiki/core';
import {
  CODE_THEME,
  normalizeCodeBlockLanguage,
} from './code-highlight-languages';

type HighlightLanguage =
  | 'bash'
  | 'shellscript'
  | 'powershell'
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'yaml'
  | 'python';

type LanguageModule = {
  default: LanguageRegistration[];
};

const LANGUAGE_LOADERS = {
  bash: () => import('shiki/langs/bash.mjs'),
  shellscript: () => import('shiki/langs/shellscript.mjs'),
  powershell: () => import('shiki/langs/powershell.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  python: () => import('shiki/langs/python.mjs'),
} satisfies Record<HighlightLanguage, () => Promise<LanguageModule>>;

let highlighterPromise: Promise<HighlighterCore> | undefined;
let highlighterInstance: HighlighterCore | undefined;
let shikiParser: Parser | undefined;
const languageModulePromises = new Map<
  HighlightLanguage,
  Promise<LanguageModule>
>();
const languagePromises = new Map<HighlightLanguage, Promise<void>>();

export function createCodeHighlightParser(): Parser {
  return (options) => {
    const language = toHighlightLanguage(options.language);
    if (!language || !options.content) {
      return [];
    }

    const highlighter = highlighterInstance;
    if (!highlighter) {
      return loadHighlighterAndLanguage(language);
    }

    if (!highlighter.getLoadedLanguages().includes(language)) {
      return loadLanguage(highlighter, language);
    }

    shikiParser ??= createParser(highlighter, { theme: CODE_THEME });

    try {
      return shikiParser({
        ...options,
        language,
      });
    } catch {
      return [];
    }
  };
}

function loadHighlighterAndLanguage(
  language: HighlightLanguage,
): Promise<void> {
  const highlighter = loadHighlighter();
  const languageModule = loadLanguageModule(language);

  return Promise.all([highlighter, languageModule]).then(
    ([loadedHighlighter]) => loadLanguage(loadedHighlighter, language),
  );
}

function loadHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
    import('shiki/themes/github-dark.mjs'),
  ])
    .then(
      async ([
        { createHighlighterCore },
        { createJavaScriptRegexEngine },
        theme,
      ]) => {
        const highlighter = await createHighlighterCore({
          themes: [theme.default],
          langs: [],
          engine: createJavaScriptRegexEngine({ forgiving: true }),
          warnings: false,
        });
        highlighterInstance = highlighter;
        return highlighter;
      },
    )
    .catch((error: unknown) => {
      highlighterPromise = undefined;
      throw error;
    });

  return highlighterPromise;
}

function loadLanguageModule(
  language: HighlightLanguage,
): Promise<LanguageModule> {
  let promise = languageModulePromises.get(language);
  if (!promise) {
    promise = LANGUAGE_LOADERS[language]().catch((error: unknown) => {
      languageModulePromises.delete(language);
      throw error;
    });
    languageModulePromises.set(language, promise);
  }

  return promise;
}

function loadLanguage(
  highlighter: HighlighterCore,
  language: HighlightLanguage,
): Promise<void> {
  let promise = languagePromises.get(language);
  if (!promise) {
    promise = loadLanguageModule(language)
      .then((module) => highlighter.loadLanguage(...module.default))
      .catch((error: unknown) => {
        languagePromises.delete(language);
        throw error;
      });
    languagePromises.set(language, promise);
  }

  return promise;
}

function toHighlightLanguage(
  language: string | undefined,
): HighlightLanguage | undefined {
  const normalized = normalizeCodeBlockLanguage(language);
  if (normalized === 'text' || normalized === 'plaintext') {
    return undefined;
  }
  if (normalized === 'shell' || normalized === 'sh' || normalized === 'zsh') {
    return 'shellscript';
  }

  switch (normalized) {
    case 'bash':
    case 'powershell':
    case 'javascript':
    case 'typescript':
    case 'json':
    case 'yaml':
    case 'python':
      return normalized;
    default:
      return undefined;
  }
}
