import {
  createMarkdownTokenizer,
  setupWikiLink,
} from '@bangle.io/prosemirror-plugins';
import {
  resolveInternalWsPath,
  resolveWikiLinkTarget,
  type WikiLinkIndex,
  type WsFilePath,
  WsPath,
} from '@bangle.io/ws-path';

const backlinkMarkdownTokenizer = createMarkdownTokenizer([setupWikiLink()]);

type MarkdownToken = ReturnType<typeof backlinkMarkdownTokenizer.parse>[number];

type LinkTarget =
  | {
      kind: 'markdown';
      href: string;
    }
  | {
      kind: 'wiki';
      target: string;
    };

function hasMarkdownExtension(path: string): boolean {
  return /\.(?:md|markdown)$/i.test(path);
}

function hasExplicitScheme(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(value);
}

function getWikiLinkTokenTarget(token: MarkdownToken): string | undefined {
  const meta = token.meta as unknown;
  if (typeof meta !== 'object' || meta === null) {
    return undefined;
  }
  const target = (meta as { target?: unknown }).target;
  return typeof target === 'string' ? target : undefined;
}

function isBangPrefixedWikiToken(
  tokens: readonly MarkdownToken[],
  index: number,
): boolean {
  const previous = tokens[index - 1];
  return previous?.type === 'text' && previous.content.endsWith('!');
}

function extractLinkTargetsFromTokens(
  tokens: readonly MarkdownToken[],
): LinkTarget[] {
  const targets: LinkTarget[] = [];

  for (const [index, token] of tokens.entries()) {
    if (token.type === 'image') {
      continue;
    }

    if (token.type === 'link_open') {
      const href = token.attrGet('href');
      if (href) {
        targets.push({ kind: 'markdown', href });
      }
    } else if (
      token.type === 'wiki_link' &&
      !isBangPrefixedWikiToken(tokens, index)
    ) {
      const target = getWikiLinkTokenTarget(token);
      if (target) {
        targets.push({ kind: 'wiki', target });
      }
    }

    if (token.children) {
      targets.push(...extractLinkTargetsFromTokens(token.children));
    }
  }

  return targets;
}

function extractLinkTargets(markdown: string): LinkTarget[] {
  return extractLinkTargetsFromTokens(
    backlinkMarkdownTokenizer.parse(markdown, {}),
  );
}

function resolveMarkdownLinkTarget(
  current: WsFilePath,
  href: string,
  index: WikiLinkIndex,
): WsFilePath | undefined {
  const input = href.trim();
  if (
    !input ||
    input.startsWith('#') ||
    hasExplicitScheme(input) ||
    input.includes('?') ||
    index.wsName !== current.wsName
  ) {
    return undefined;
  }

  const markdownPath = input.split('#', 1)[0] ?? input;
  const anchorIndex = input.indexOf('#');
  const anchor = anchorIndex >= 0 ? input.slice(anchorIndex) : '';
  const candidates = hasMarkdownExtension(markdownPath)
    ? [input]
    : [`${markdownPath}.md${anchor}`, `${markdownPath}.markdown${anchor}`];
  const matches: WsFilePath[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const resolved = resolveInternalWsPath(current, candidate);
    const match = resolved ? index.byWsPath.get(resolved.wsPath) : undefined;
    if (match && !seen.has(match.wsPath)) {
      seen.add(match.wsPath);
      matches.push(match);
    }
  }
  return matches.length === 1 ? matches[0] : undefined;
}

function addLinkedWsPath(
  linkedWsPaths: Set<string>,
  current: WsFilePath,
  resolved: WsFilePath | undefined,
) {
  if (resolved && resolved.wsPath !== current.wsPath) {
    linkedWsPaths.add(resolved.wsPath);
  }
}

/** Extracts existing Markdown files linked from one note for backlink indexing. */
export function extractLinkedWsPathsFromMarkdown({
  currentWsPath,
  index,
  markdown,
}: {
  currentWsPath: string | WsFilePath;
  index: WikiLinkIndex;
  markdown: string;
}): string[] {
  const current = WsPath.safeParse(currentWsPath).data?.asFile();
  if (!current || index.wsName !== current.wsName) {
    return [];
  }

  const linkedWsPaths = new Set<string>();

  for (const target of extractLinkTargets(markdown)) {
    const resolved =
      target.kind === 'wiki'
        ? resolveWikiLinkTarget(current, target.target, index)
        : resolveMarkdownLinkTarget(current, target.href, index);
    addLinkedWsPath(linkedWsPaths, current, resolved);
  }

  return [...linkedWsPaths];
}
