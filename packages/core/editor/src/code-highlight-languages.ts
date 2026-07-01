export const CODE_THEME = 'github-dark';

const SUPPORTED_LANGS = [
  'text',
  'plaintext',
  'bash',
  'shell',
  'sh',
  'zsh',
  'powershell',
  'javascript',
  'typescript',
  'json',
  'yaml',
  'python',
] as const;

export type SupportedCodeBlockLanguage = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_CODE_BLOCK_LANGUAGE: SupportedCodeBlockLanguage = 'text';

export function getRawCodeBlockLanguage(language: unknown): string {
  if (typeof language !== 'string') {
    return '';
  }
  return language.trim().toLowerCase();
}

export function normalizeCodeBlockLanguage(
  language: unknown,
): SupportedCodeBlockLanguage {
  const normalized = getRawCodeBlockLanguage(language);
  if (!normalized) {
    return DEFAULT_CODE_BLOCK_LANGUAGE;
  }

  if (normalized === 'ps1' || normalized === 'pwsh') {
    return 'powershell';
  }
  if (normalized === 'js') {
    return 'javascript';
  }
  if (normalized === 'ts') {
    return 'typescript';
  }
  if (normalized === 'yml') {
    return 'yaml';
  }
  if (normalized === 'console') {
    return 'bash';
  }

  if ((SUPPORTED_LANGS as readonly string[]).includes(normalized)) {
    return normalized as SupportedCodeBlockLanguage;
  }

  return DEFAULT_CODE_BLOCK_LANGUAGE;
}
