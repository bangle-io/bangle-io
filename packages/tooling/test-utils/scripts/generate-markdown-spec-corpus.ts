/**
 * Regenerates `../markdown-spec-corpus.ts` from pinned upstream Markdown
 * spec sources. Run from the repository root:
 *
 *     bun packages/tooling/test-utils/scripts/generate-markdown-spec-corpus.ts
 *     pnpm lint:fix
 *
 * Sources are fetched from the pinned commits below and verified against
 * the recorded sha256 checksums, so a regeneration is reproducible
 * byte-for-byte. Set `BANGLE_SPEC_CORPUS_DIR` to a directory containing
 * `commonmark-spec.txt`, `gfm-spec.txt`, and `gfm-extensions.txt` to work
 * offline — the checksums are still enforced.
 *
 * Selection rules (the reason this is a script and not hand-edited data):
 *
 * 1. Every spec example's Markdown *input* is round-tripped twice through
 *    BOTH editor engines (ProseMirror via `@bangle.io/prosemirror-plugins`
 *    with the same extension set as the golden-corpus spec, and Wordgard via
 *    `@bangle.io/wordgard-markdown`).
 * 2. An input becomes a plain fixture when both engines return it unchanged.
 * 3. An input becomes a `canonical` fixture when both engines produce the
 *    same different output, that output is a fixed point in both, AND the
 *    normalization is representation-only: the canonical form must parse to
 *    a document equal to the input's parse. This last check is what keeps
 *    known data loss out of the corpus — e.g. `[](./target.md)` serializing
 *    to `''` (href destroyed) or `[link](foo\)\:)` truncating its href must
 *    never be blessed as expected behavior. See the matching policy note in
 *    `markdown-corpus.ts` next to the empty-link exclusion.
 * 4. Inputs already present in the curated `MARKDOWN_CORPUS` are skipped.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import {
  markdownLoader,
  resolve as resolveCollections,
  Schema,
  setupBase,
  setupBlockquote,
  setupBold,
  setupCode,
  setupCodeBlock,
  setupFrontmatter,
  setupHardBreak,
  setupHeading,
  setupHighlight,
  setupHorizontalRule,
  setupImage,
  setupItalic,
  setupLink,
  setupList,
  setupMath,
  setupParagraph,
  setupStrike,
  setupTable,
  setupWikiLink,
} from '@bangle.io/prosemirror-plugins';
import { createNoteMarkdownCodec } from '@bangle.io/wordgard-markdown';
import { MARKDOWN_CORPUS } from '../markdown-corpus';

type SpecSource = {
  id: string;
  /** Human-readable spec version, used in fixture names. */
  label: string;
  url: string;
  sha256: string;
  localName: string;
};

// commonmark/commonmark-spec @ 0.31.2 (commit 3da9394) and
// github/cmark-gfm @ 587a12b (GFM spec 0.29 + extension tests).
const SOURCES: readonly SpecSource[] = [
  {
    id: 'commonmark',
    label: 'commonmark 0.31.2',
    url: 'https://raw.githubusercontent.com/commonmark/commonmark-spec/3da939428d80f146f270cd1765e4ba462e96bb1b/spec.txt',
    sha256: '43fad3e0ac5190a3b0bc6a41f7b1a853201a26ec2e6b74871f5d96239a8c34cf',
    localName: 'commonmark-spec.txt',
  },
  {
    id: 'gfm',
    label: 'gfm 0.29',
    url: 'https://raw.githubusercontent.com/github/cmark-gfm/587a12bb54d95ac37241377e6ddc93ea0e45439b/test/spec.txt',
    sha256: '7d8e5814befec287ac116786d81ff14e0adc9b13295b4494649e995408fd871c',
    localName: 'gfm-spec.txt',
  },
  {
    id: 'gfm-ext',
    label: 'gfm extensions',
    url: 'https://raw.githubusercontent.com/github/cmark-gfm/587a12bb54d95ac37241377e6ddc93ea0e45439b/test/extensions.txt',
    sha256: 'a2a45e98be9fca95f564f927265a0f63beea6cae5369d1cf4bde44caa51b2a3a',
    localName: 'gfm-extensions.txt',
  },
];

async function loadSource(source: SpecSource): Promise<string> {
  const localDir = process.env.BANGLE_SPEC_CORPUS_DIR;
  let text: string;
  if (localDir) {
    text = await readFile(path.join(localDir, source.localName), 'utf8');
  } else {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
    }
    text = await response.text();
  }
  const digest = createHash('sha256').update(text).digest('hex');
  if (digest !== source.sha256) {
    throw new Error(
      `Checksum mismatch for ${source.id}: expected ${source.sha256}, got ${digest}. ` +
        'If the pin was updated intentionally, update the sha256 above.',
    );
  }
  return text;
}

/**
 * Byte-stable inputs are kept from every section, but `canonical`
 * (normalizing) fixtures are limited to the inline-construct sections: the
 * inline-mark interaction space is where mark exclusion/ordering bugs live
 * (the corpus's reason to exist), and block-level normalizations are
 * already covered by the hand-curated corpus. This also keeps the
 * generated file at a reviewable size.
 */
const CANONICAL_SECTIONS = new Set([
  'Autolinks',
  'Autolinks (extension)',
  'Backslash escapes',
  'Code spans',
  'Emphasis and strong emphasis',
  'Entity and numeric character references',
  'Hard line breaks',
  'Images',
  'Inlines',
  'Links',
  'Precedence',
  'Strikethrough (extension)',
  'Strikethroughs',
  'Task list items (extension)',
  'Task lists',
  'Textual content',
]);

type SpecExample = {
  source: SpecSource;
  /** 1-based position in the source file — matches the spec's own example numbering. */
  number: number;
  section: string;
  markdown: string;
};

/**
 * Spec examples are fenced by a 32-backtick `example` block containing the
 * Markdown input, a lone `.`, and the expected HTML (which is irrelevant
 * here — only the inputs are used). `→` encodes a tab character.
 */
function extractExamples(source: SpecSource, text: string): SpecExample[] {
  const examplePattern = /^`{32} example.*?\n([\s\S]*?)^\.\n[\s\S]*?^`{32}$/gm;
  const sectionPattern = /^#{1,3} +(.*)$/gm;
  const sections: Array<{ offset: number; name: string }> = [];
  for (const match of text.matchAll(sectionPattern)) {
    sections.push({ offset: match.index, name: match[1] ?? '' });
  }
  const examples: SpecExample[] = [];
  let number = 0;
  for (const match of text.matchAll(examplePattern)) {
    number += 1;
    let section = '';
    for (const candidate of sections) {
      if (candidate.offset < match.index) section = candidate.name;
      else break;
    }
    examples.push({
      source,
      number,
      section,
      markdown: (match[1] ?? '').replaceAll('→', '\t').replace(/\n$/, ''),
    });
  }
  return examples;
}

// The same markdown-relevant extension set as
// `packages/core/editor/src/__tests__/markdown-golden-corpus.spec.ts`.
function createPmMarkdown() {
  const extensions = [
    setupBase({ docContent: 'frontmatter? block+' }),
    setupFrontmatter(),
    setupBlockquote(),
    setupHighlight(),
    setupBold(),
    setupList(),
    setupMath(),
    setupHardBreak(),
    setupHeading(),
    setupParagraph(),
    setupStrike(),
    setupWikiLink(),
    setupHorizontalRule(),
    setupCode(),
    setupCodeBlock(),
    setupItalic(),
    setupLink(),
    setupImage(),
    setupTable(),
  ];
  const resolved = resolveCollections(extensions);
  const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
  return markdownLoader(extensions, schema);
}

type Fixture = {
  example: SpecExample;
  markdown: string;
  canonical?: string;
};

function classify(
  pm: ReturnType<typeof createPmMarkdown>,
  wordgard: ReturnType<typeof createNoteMarkdownCodec>,
  example: SpecExample,
): Fixture | null {
  const input = example.markdown;
  if (!input) return null;
  let pm1: string;
  let pm2: string;
  let wg1: string;
  let wg2: string;
  try {
    const pmRoundTrip = (value: string) =>
      pm.serializer.serialize(pm.parser.parse(value));
    const wgRoundTrip = (value: string) =>
      wordgard.serialize(wordgard.parse(value));
    pm1 = pmRoundTrip(input);
    pm2 = pmRoundTrip(pm1);
    wg1 = wgRoundTrip(input);
    wg2 = wgRoundTrip(wg1);
  } catch {
    return null;
  }

  if (pm1 === input && wg1 === input) {
    return { example, markdown: input };
  }

  if (!CANONICAL_SECTIONS.has(example.section)) return null;
  const stableAndIdentical = pm1 === wg1 && pm2 === pm1 && wg2 === wg1;
  if (!stableAndIdentical) return null;

  // Reject normalizations that lose content instead of re-spelling it: the
  // canonical form must describe the same document as the input.
  if (pm1 === '') return null;
  const inputDoc = pm.parser.parse(input);
  const canonicalDoc = pm.parser.parse(pm1);
  if (!inputDoc || !canonicalDoc || !inputDoc.eq(canonicalDoc)) return null;

  return { example, markdown: input, canonical: pm1 };
}

function fixtureName(fixture: Fixture): string {
  const { source, number, section } = fixture.example;
  return `${source.label} ex ${number} (${section})`;
}

function toTsString(value: string): string {
  return JSON.stringify(value);
}

function emit(fixtures: readonly Fixture[]): string {
  const header = `// GENERATED FILE — do not hand-edit expected bytes; see the policy note
// below. Regenerate with:
//   bun packages/tooling/test-utils/scripts/generate-markdown-spec-corpus.ts
//   pnpm lint:fix
import type { MarkdownCorpusFixture } from './markdown-corpus';

/**
 * Spec-derived companion to \`MARKDOWN_CORPUS\` (same contract, same
 * two-engine gate): example *inputs* from the pinned CommonMark and GFM
 * spec sources listed in \`scripts/generate-markdown-spec-corpus.ts\`,
 * mechanically filtered to the entries both editor engines already handle
 * identically. Fixture names carry the source spec's own example number,
 * so \`commonmark 0.31.2 ex 341 (Code spans)\` can be looked up upstream.
 *
 * - Fixtures without \`canonical\` round-trip byte-identically in BOTH
 *   engines.
 * - Fixtures with \`canonical\` normalize to the same stable bytes in both
 *   engines, and the canonical form parses to a document equal to the
 *   input's parse — normalizations that lose content (dropped hrefs,
 *   truncated targets) are filtered out by the generator and must never be
 *   added here by hand.
 *
 * A failure means an engine's round trip drifted (or the engines diverged)
 * — fix the engine, or, for a deliberate serializer change, rerun the
 * generator and review its diff.
 */

const BOTH_ENGINES: ReadonlyArray<'prosemirror' | 'wordgard'> = [
  'prosemirror',
  'wordgard',
];

export const MARKDOWN_SPEC_CORPUS: readonly MarkdownCorpusFixture[] = [
`;

  const lines: string[] = [header];
  let currentGroup = '';
  for (const fixture of fixtures) {
    const group = `${fixture.example.source.label} — ${fixture.example.section}`;
    if (group !== currentGroup) {
      currentGroup = group;
      lines.push(`  // --- ${group} ---`);
    }
    lines.push('  {');
    lines.push(`    name: ${toTsString(fixtureName(fixture))},`);
    lines.push(`    markdown: ${toTsString(fixture.markdown)},`);
    if (fixture.canonical !== undefined) {
      lines.push(`    canonical: ${toTsString(fixture.canonical)},`);
    }
    lines.push('    engines: BOTH_ENGINES,');
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const pm = createPmMarkdown();
  const wordgard = createNoteMarkdownCodec();
  const curated = new Set(MARKDOWN_CORPUS.map((fixture) => fixture.markdown));
  const seen = new Set<string>();
  const fixtures: Fixture[] = [];
  let dropped = 0;

  for (const source of SOURCES) {
    const text = await loadSource(source);
    for (const example of extractExamples(source, text)) {
      if (curated.has(example.markdown) || seen.has(example.markdown)) {
        continue;
      }
      const fixture = classify(pm, wordgard, example);
      if (!fixture) {
        dropped += 1;
        continue;
      }
      seen.add(example.markdown);
      fixtures.push(fixture);
    }
  }

  const outPath = path.join(
    import.meta.dirname,
    '..',
    'markdown-spec-corpus.ts',
  );
  await writeFile(outPath, emit(fixtures));
  const canonicalCount = fixtures.filter(
    (f) => f.canonical !== undefined,
  ).length;
  console.log(
    `Wrote ${fixtures.length} fixtures (${
      fixtures.length - canonicalCount
    } byte-stable, ${canonicalCount} canonical); ${dropped} spec examples did not qualify.`,
  );
  console.log('Now run: pnpm lint:fix');
}

await main();
