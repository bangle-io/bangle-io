import {
  createBaseMarkdownTokenizer,
  frontmatterTokenizer,
  parseWikiLinkContent,
  wikiLinkTokenizer,
} from '@bangle.io/markdown-syntax';
import {
  createWikiLinkIndex,
  normalizeStoredMarkdownLinkTarget,
  relativeMarkdownAssetHref,
  resolveInternalWsPath,
  resolveWikiLinkTarget,
  resolveWorkspaceMarkdownAssetReferenceCandidates,
  type WsFilePath,
  WsPath,
} from '@bangle.io/ws-path';

export type NoteRelocationReferenceRewriteWarning = Readonly<{
  kind: 'unsupported-reference';
  count: number;
}>;

export type NoteRelocationReferenceRewritePlan = Readonly<{
  markdown: string;
  rewrittenReferences: number;
  unsupportedReferences: number;
  warnings: readonly NoteRelocationReferenceRewriteWarning[];
}>;

export type NoteRelocationReferenceRewriteRequest = Readonly<{
  markdown: string;
  source: string | WsFilePath;
  destination: string | WsFilePath;
  existingWsPaths: readonly (string | WsFilePath)[];
}>;

type Span = { start: number; end: number; value: string; next: number };
type Replacement = Omit<Span, 'next'>;
type SourceLine = Pick<Span, 'start' | 'value'>;

const relocationMarkdownTokenizer = createBaseMarkdownTokenizer()
  .use(wikiLinkTokenizer)
  .use(frontmatterTokenizer);

function unchanged(markdown: string): NoteRelocationReferenceRewritePlan {
  return {
    markdown,
    rewrittenReferences: 0,
    unsupportedReferences: 0,
    warnings: [],
  };
}

function matchingCloser(
  source: string,
  start: number,
  opening: string,
  closing: string,
): number {
  let depth = 0;
  for (let position = start; position < source.length; position += 1) {
    const character = source[position];
    if (character === opening) {
      depth += 1;
    } else if (character === closing) {
      if (depth === 0) {
        return position;
      }
      depth -= 1;
    }
  }
  return -1;
}

function hasOnlyTitle(value: string): boolean {
  if (!value) {
    return true;
  }
  if (!/^[ \t]+/.test(value)) {
    return false;
  }
  const title = value.trim();
  return (
    title.length >= 2 &&
    ((title[0] === '"' && title.at(-1) === '"') ||
      (title[0] === "'" && title.at(-1) === "'") ||
      (title[0] === '(' && title.at(-1) === ')'))
  );
}

function inlineMarkdownLink(source: string, start: number): Span | undefined {
  if (source[start] !== '[') {
    return undefined;
  }
  const labelEnd = matchingCloser(source, start + 1, '[', ']');
  if (labelEnd < 0 || source[labelEnd + 1] !== '(') {
    return undefined;
  }
  const end = matchingCloser(source, labelEnd + 2, '(', ')');
  if (end < 0) {
    return undefined;
  }

  let hrefStart = labelEnd + 2;
  while (source[hrefStart] === ' ' || source[hrefStart] === '\t') {
    hrefStart += 1;
  }
  let hrefEnd = hrefStart;
  while (hrefEnd < end && source[hrefEnd] !== ' ' && source[hrefEnd] !== '\t') {
    hrefEnd += 1;
  }
  if (hrefEnd === hrefStart || !hasOnlyTitle(source.slice(hrefEnd, end))) {
    return undefined;
  }
  return {
    start: hrefStart,
    end: hrefEnd,
    value: source.slice(hrefStart, hrefEnd),
    next: end + 1,
  };
}

function wikiLink(source: string, start: number): Span | undefined {
  if (source.slice(start, start + 2) !== '[[' || source[start - 1] === '!') {
    return undefined;
  }
  const close = source.indexOf(']]', start + 2);
  const attrs =
    close < 0
      ? undefined
      : parseWikiLinkContent(source.slice(start + 2, close));
  if (
    !attrs ||
    attrs.target.trim() !== attrs.target ||
    source[close + 2] === '('
  ) {
    return undefined;
  }
  return {
    start: start + 2,
    end: start + 2 + attrs.target.length,
    value: attrs.target,
    next: close + 2,
  };
}

function lineStarts(markdown: string): number[] {
  const starts = [0];
  for (let index = 0; index < markdown.length; index += 1) {
    if (markdown[index] === '\n') {
      starts.push(index + 1);
    }
  }
  return starts;
}

function sourceLine(
  markdown: string,
  starts: readonly number[],
  line: number,
): string {
  const start = starts[line];
  const end = starts[line + 1] ?? markdown.length;
  return markdown.slice(start, end).replace(/\r?\n$/, '');
}

/**
 * Selects only one-line, root-level paragraph tokens whose raw source exactly
 * matches the tokenizer's inline content. Containers, frontmatter, code
 * blocks, headings, and multi-line paragraphs cannot satisfy this contract.
 * Lines with code markers, escapes, or HTML delimiters are also skipped because
 * their inline token positions do not provide source offsets for safe edits.
 */
function directInlineSourceLines(markdown: string): readonly SourceLine[] {
  const starts = lineStarts(markdown);
  const tokens = relocationMarkdownTokenizer.parse(markdown, {});
  const lines: SourceLine[] = [];

  for (const [index, token] of tokens.entries()) {
    const previous = tokens[index - 1];
    const map = token.map;
    if (
      token.type !== 'inline' ||
      !map ||
      map[1] !== map[0] + 1 ||
      token.level !== 1 ||
      previous?.type !== 'paragraph_open' ||
      previous.level !== 0
    ) {
      continue;
    }
    const line = sourceLine(markdown, starts, map[0]);
    if (
      token.content !== line ||
      line.includes('`') ||
      line.includes('\\') ||
      line.includes('<') ||
      line.includes('>')
    ) {
      continue;
    }
    lines.push({
      start: starts[map[0]] ?? 0,
      value: line,
    });
  }
  return lines;
}

function splitFragment(value: string): { path: string; fragment: string } {
  const index = value.indexOf('#');
  return index < 0
    ? { path: value, fragment: '' }
    : { path: value.slice(0, index), fragment: value.slice(index) };
}

function explicitWikiHref(href: string): string {
  return /^(?:\.\/|\.\.\/)/.test(href) ? href : `./${href}`;
}

function existingFiles(
  wsPaths: readonly (string | WsFilePath)[],
): Map<string, WsFilePath> {
  const files = new Map<string, WsFilePath>();
  for (const wsPath of wsPaths) {
    const file = WsPath.safeParse(wsPath).data?.asFile();
    if (file) {
      files.set(file.wsPath, file);
    }
  }
  return files;
}

function movedTarget(
  target: WsFilePath,
  source: WsFilePath,
  destination: WsFilePath,
): WsFilePath {
  return target.wsPath === source.wsPath ? destination : target;
}

function markdownTarget(
  source: WsFilePath,
  href: string,
  files: ReadonlyMap<string, WsFilePath>,
): WsFilePath | undefined {
  const normalized = normalizeStoredMarkdownLinkTarget(href);
  if (normalized?.kind !== 'internal' || normalized.href.startsWith('#')) {
    return undefined;
  }
  const resolved = resolveInternalWsPath(source, normalized.href);
  return resolved ? files.get(resolved.wsPath) : undefined;
}

function localFileTarget(
  source: WsFilePath,
  href: string,
  files: ReadonlyMap<string, WsFilePath>,
): WsFilePath | undefined {
  return resolveWorkspaceMarkdownAssetReferenceCandidates(source, href)
    .map((candidate) => files.get(candidate.wsPath))
    .find((candidate): candidate is WsFilePath => Boolean(candidate));
}

function extensionlessMarkdownTarget(
  source: WsFilePath,
  href: string,
  files: ReadonlyMap<string, WsFilePath>,
): WsFilePath | undefined {
  const { path, fragment } = splitFragment(href);
  const fileName = path.split('/').at(-1);
  if (
    !path ||
    !fileName ||
    fileName.includes('.') ||
    path.includes('?') ||
    path.includes('://') ||
    path.includes(':')
  ) {
    return undefined;
  }
  const matches = new Map<string, WsFilePath>();
  for (const extension of ['.md', '.markdown']) {
    const resolved = resolveInternalWsPath(
      source,
      `${path}${extension}${fragment}`,
    );
    const target = resolved ? files.get(resolved.wsPath) : undefined;
    if (target) {
      matches.set(target.wsPath, target);
    }
  }
  return matches.size === 1 ? matches.values().next().value : undefined;
}

function applyReplacements(
  markdown: string,
  replacements: readonly Replacement[],
): string {
  return [...replacements]
    .sort((a, b) => b.start - a.start)
    .reduce(
      (rewritten, replacement) =>
        rewritten.slice(0, replacement.start) +
        replacement.value +
        rewritten.slice(replacement.end),
      markdown,
    );
}

/**
 * Plans source-only edits for explicit wiki links and inline Markdown links
 * found in one-line root paragraphs. Other Markdown is intentionally skipped.
 */
export function planNoteRelocationReferenceRewrite({
  markdown,
  source: sourceInput,
  destination: destinationInput,
  existingWsPaths,
}: NoteRelocationReferenceRewriteRequest): NoteRelocationReferenceRewritePlan {
  const source = WsPath.safeParse(sourceInput).data?.asFile();
  const destination = WsPath.safeParse(destinationInput).data?.asFile();
  if (
    !source ||
    !destination ||
    source.wsName !== destination.wsName ||
    source.wsPath === destination.wsPath
  ) {
    return unchanged(markdown);
  }

  const files = existingFiles(existingWsPaths);
  files.set(source.wsPath, source);
  const wikiIndex = createWikiLinkIndex([...files.values()], source.wsName);
  const replacements: Replacement[] = [];
  let unsupportedReferences = 0;

  for (const line of directInlineSourceLines(markdown)) {
    for (let start = 0; start < line.value.length; start += 1) {
      const markdownLink = inlineMarkdownLink(line.value, start);
      if (markdownLink) {
        const target =
          markdownTarget(source, markdownLink.value, files) ??
          localFileTarget(source, markdownLink.value, files);
        if (target) {
          const href = relativeMarkdownAssetHref(
            destination,
            movedTarget(target, source, destination),
          );
          if (href) {
            const replacement = `${href}${splitFragment(markdownLink.value).fragment}`;
            if (replacement !== markdownLink.value) {
              replacements.push({
                ...markdownLink,
                start: line.start + markdownLink.start,
                end: line.start + markdownLink.end,
                value: replacement,
              });
            }
          }
        } else if (
          extensionlessMarkdownTarget(source, markdownLink.value, files)
        ) {
          unsupportedReferences += 1;
        }
        start = markdownLink.next - 1;
        continue;
      }

      const wiki = wikiLink(line.value, start);
      if (!wiki) {
        continue;
      }
      const { path, fragment } = splitFragment(wiki.value);
      if (/^(?:\.\/|\.\.\/|\/)/.test(path)) {
        const target = resolveWikiLinkTarget(source, path, wikiIndex);
        if (target) {
          const href = relativeMarkdownAssetHref(
            destination,
            movedTarget(target, source, destination),
          );
          if (href) {
            const replacement = `${explicitWikiHref(href)}${fragment}`;
            if (replacement !== wiki.value) {
              replacements.push({
                ...wiki,
                start: line.start + wiki.start,
                end: line.start + wiki.end,
                value: replacement,
              });
            }
          }
        } else {
          unsupportedReferences += 1;
        }
      }
      start = wiki.next - 1;
    }
  }

  const warnings = unsupportedReferences
    ? [{ kind: 'unsupported-reference' as const, count: unsupportedReferences }]
    : [];
  return {
    markdown: applyReplacements(markdown, replacements),
    rewrittenReferences: replacements.length,
    unsupportedReferences,
    warnings,
  };
}
