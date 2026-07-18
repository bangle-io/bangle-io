// GENERATED FILE — do not hand-edit expected bytes; see the policy note
// below. Regenerate with:
//   bun packages/tooling/test-utils/scripts/generate-markdown-spec-corpus.ts
//   pnpm lint:fix
import type { MarkdownCorpusFixture } from './markdown-corpus';

/**
 * Spec-derived companion to `MARKDOWN_CORPUS` (same contract, same
 * two-engine gate): example *inputs* from the pinned CommonMark and GFM
 * spec sources listed in `scripts/generate-markdown-spec-corpus.ts`,
 * mechanically filtered to the entries both editor engines already handle
 * identically. Fixture names carry the source spec's own example number,
 * so `commonmark 0.31.2 ex 341 (Code spans)` can be looked up upstream.
 *
 * - Fixtures without `canonical` round-trip byte-identically in BOTH
 *   engines.
 * - Fixtures with `canonical` normalize to the same stable bytes in both
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
  // --- commonmark 0.31.2 — Backslash escapes ---
  {
    name: 'commonmark 0.31.2 ex 12 (Backslash escapes)',
    markdown:
      '\\!\\"\\#\\$\\%\\&\\\'\\(\\)\\*\\+\\,\\-\\.\\/\\:\\;\\<\\=\\>\\?\\@\\[\\\\\\]\\^\\_\\`\\{\\|\\}\\~',
    canonical: '!"#$%&\'()\\*+,-./:;<=>?@\\[\\\\\\]^\\_\\`{|}\\~',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 13 (Backslash escapes)',
    markdown: '\\\t\\A\\a\\ \\3\\φ\\«',
    canonical: '\\\\\t\\\\A\\\\a\\\\ \\\\3\\\\φ\\\\«',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — not a heading ---
  {
    name: 'commonmark 0.31.2 ex 16 (not a heading)',
    markdown: 'foo\\\nbar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 17 (not a heading)',
    markdown: '`` \\[\\` ``',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 24 (not a heading)',
    markdown: '``` foo\\+bar\nfoo\n```',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Entity and numeric character references ---
  {
    name: 'commonmark 0.31.2 ex 25 (Entity and numeric character references)',
    markdown:
      '&nbsp; &amp; &copy; &AElig; &Dcaron;\n&frac34; &HilbertSpace; &DifferentialD;\n&ClockwiseContourIntegral; &ngE;',
    canonical: '  & © Æ Ď ¾ ℋ ⅆ ∲ ≧̸',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 26 (Entity and numeric character references)',
    markdown: '&#35; &#1234; &#992; &#0;',
    canonical: '\\# Ӓ Ϡ �',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 27 (Entity and numeric character references)',
    markdown: '&#X22; &#XD06; &#xcab;',
    canonical: '" ആ ಫ',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 28 (Entity and numeric character references)',
    markdown:
      '&nbsp &x; &#; &#x;\n&#87654321;\n&#abcdef0;\n&ThisIsNotDefined; &hi?;',
    canonical:
      '&nbsp &x; &#; &#x; &#87654321; &#abcdef0; &ThisIsNotDefined; &hi?;',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 29 (Entity and numeric character references)',
    markdown: '&copy',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 30 (Entity and numeric character references)',
    markdown: '&MadeUpEntity;',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 31 (Entity and numeric character references)',
    markdown: '<a href="&ouml;&ouml;.html">',
    canonical: '<a href="öö.html">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 32 (Entity and numeric character references)',
    markdown: '[foo](/f&ouml;&ouml; "f&ouml;&ouml;")',
    canonical: '[foo](/f%C3%B6%C3%B6 "föö")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 33 (Entity and numeric character references)',
    markdown: '[foo]\n\n[foo]: /f&ouml;&ouml; "f&ouml;&ouml;"',
    canonical: '[foo](/f%C3%B6%C3%B6 "föö")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 34 (Entity and numeric character references)',
    markdown: '``` f&ouml;&ouml;\nfoo\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 35 (Entity and numeric character references)',
    markdown: '`f&ouml;&ouml;`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 36 (Entity and numeric character references)',
    markdown: '    f&ouml;f&ouml;',
    canonical: '```\nf&ouml;f&ouml;\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 37 (Entity and numeric character references)',
    markdown: '&#42;foo&#42;\n*foo*',
    canonical: '\\*foo\\* _foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 38 (Entity and numeric character references)',
    markdown: '&#42; foo\n\n* foo',
    canonical: '\\* foo\n\n- foo',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 41 (Entity and numeric character references)',
    markdown: '[a](url &quot;tit&quot;)',
    canonical: '\\[a\\](url "tit")',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Precedence ---
  {
    name: 'commonmark 0.31.2 ex 42 (Precedence)',
    markdown: '- `one\n- two`',
    canonical: '- \\`one\n\n- two\\`',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Thematic breaks ---
  {
    name: 'commonmark 0.31.2 ex 45 (Thematic breaks)',
    markdown: '===',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — foo ---
  {
    name: 'commonmark 0.31.2 ex 63 (foo)',
    markdown: '####### foo',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 64 (foo)',
    markdown: '#5 bolt\n\n#hashtag',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 65 (foo)',
    markdown: '\\## foo',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — foo ###      ---
  {
    name: 'commonmark 0.31.2 ex 74 (foo ###     )',
    markdown: '### foo ### b',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — foo ### b ---
  {
    name: 'commonmark 0.31.2 ex 75 (foo ### b)',
    markdown: '# foo#',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Fenced code blocks ---
  {
    name: 'commonmark 0.31.2 ex 119 (Fenced code blocks)',
    markdown: '```\n<\n >\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 122 (Fenced code blocks)',
    markdown: '```\naaa\n~~~\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 129 (Fenced code blocks)',
    markdown: '```\n\n  \n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 130 (Fenced code blocks)',
    markdown: '```\n```',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — baz ---
  {
    name: 'commonmark 0.31.2 ex 142 (baz)',
    markdown: '```ruby\ndef foo(x)\n  return 3\nend\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 146 (baz)',
    markdown: '~~~ aa ``` ~~~\nfoo\n~~~',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — HTML blocks ---
  {
    name: 'commonmark 0.31.2 ex 183 (HTML blocks)',
    markdown: '<!DOCTYPE html>',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Paragraphs ---
  {
    name: 'commonmark 0.31.2 ex 221 (Paragraphs)',
    markdown: 'aaa\n\nbbb',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Block quotes ---
  {
    name: 'commonmark 0.31.2 ex 244 (Block quotes)',
    markdown: '> foo\n\n> bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 246 (Block quotes)',
    markdown: '> foo\n>\n> bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 250 (Block quotes)',
    markdown: '> bar\n\nbaz',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — List items ---
  {
    name: 'commonmark 0.31.2 ex 258 (List items)',
    markdown: '- one\n\n  two',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Lists ---
  {
    name: 'commonmark 0.31.2 ex 324 (Lists)',
    markdown: '- a',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 326 (Lists)',
    markdown: '1. ```\n   foo\n   ```\n\n   bar',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Inlines ---
  {
    name: 'commonmark 0.31.2 ex 329 (Inlines)',
    markdown: '`hi`lo`',
    canonical: '`hi`lo\\`',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Code spans ---
  {
    name: 'commonmark 0.31.2 ex 330 (Code spans)',
    markdown: '`foo`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 331 (Code spans)',
    markdown: '`` foo ` bar ``',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 332 (Code spans)',
    markdown: '` `` `',
    canonical: '``` `` ```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 333 (Code spans)',
    markdown: '`  ``  `',
    canonical: '```  ``  ```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 334 (Code spans)',
    markdown: '` a`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 335 (Code spans)',
    markdown: '` b `',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 336 (Code spans)',
    markdown: '` `\n`  `',
    canonical: '` ` `  `',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 337 (Code spans)',
    markdown: '``\nfoo\nbar  \nbaz\n``',
    canonical: '`foo bar   baz`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 338 (Code spans)',
    markdown: '``\nfoo \n``',
    canonical: '`foo `',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 339 (Code spans)',
    markdown: '`foo   bar \nbaz`',
    canonical: '`foo   bar  baz`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 340 (Code spans)',
    markdown: '`foo\\`bar`',
    canonical: '`foo\\`bar\\`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 341 (Code spans)',
    markdown: '``foo`bar``',
    canonical: '`` foo`bar ``',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 342 (Code spans)',
    markdown: '` foo `` bar `',
    canonical: '``` foo `` bar ```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 343 (Code spans)',
    markdown: '*foo`*`',
    canonical: '\\*foo`*`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 344 (Code spans)',
    markdown: '[not a `link](/foo`)',
    canonical: '\\[not a `link](/foo`)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 345 (Code spans)',
    markdown: '`<a href="`">`',
    canonical: '`<a href="`">\\`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 346 (Code spans)',
    markdown: '<a href="`">`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 347 (Code spans)',
    markdown: '`<https://foo.bar.`baz>`',
    canonical: '`<https://foo.bar.`baz>\\`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 348 (Code spans)',
    markdown: '<https://foo.bar.`baz>`',
    canonical: '[https://foo.bar.\\`baz](https://foo.bar.%60baz)\\`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 349 (Code spans)',
    markdown: '```foo``',
    canonical: '\\`\\`\\`foo\\`\\`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 350 (Code spans)',
    markdown: '`foo',
    canonical: '\\`foo',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 351 (Code spans)',
    markdown: '`foo``bar``',
    canonical: '\\`foo`bar`',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Emphasis and strong emphasis ---
  {
    name: 'commonmark 0.31.2 ex 352 (Emphasis and strong emphasis)',
    markdown: '*foo bar*',
    canonical: '_foo bar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 353 (Emphasis and strong emphasis)',
    markdown: 'a * foo bar*',
    canonical: 'a \\* foo bar\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 354 (Emphasis and strong emphasis)',
    markdown: 'a*"foo"*',
    canonical: 'a\\*"foo"\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 355 (Emphasis and strong emphasis)',
    markdown: '* a *',
    canonical: '\\* a \\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 356 (Emphasis and strong emphasis)',
    markdown: '*$*alpha.\n\n*£*bravo.\n\n*€*charlie.\n\n*𞋿*delta.',
    canonical:
      '\\*$\\*alpha.\n\n\\*£\\*bravo.\n\n\\*€\\*charlie.\n\n\\*𞋿\\*delta.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 359 (Emphasis and strong emphasis)',
    markdown: '_foo bar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 360 (Emphasis and strong emphasis)',
    markdown: '_ foo bar_',
    canonical: '\\_ foo bar\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 361 (Emphasis and strong emphasis)',
    markdown: 'a_"foo"_',
    canonical: 'a\\_"foo"\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 362 (Emphasis and strong emphasis)',
    markdown: 'foo_bar_',
    canonical: 'foo_bar\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 363 (Emphasis and strong emphasis)',
    markdown: '5_6_78',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 364 (Emphasis and strong emphasis)',
    markdown: 'пристаням_стремятся_',
    canonical: 'пристаням\\_стремятся\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 365 (Emphasis and strong emphasis)',
    markdown: 'aa_"bb"_cc',
    canonical: 'aa\\_"bb"\\_cc',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 366 (Emphasis and strong emphasis)',
    markdown: 'foo-_(bar)_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 367 (Emphasis and strong emphasis)',
    markdown: '_foo*',
    canonical: '\\_foo\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 368 (Emphasis and strong emphasis)',
    markdown: '*foo bar *',
    canonical: '\\*foo bar \\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 369 (Emphasis and strong emphasis)',
    markdown: '*foo bar\n*',
    canonical: '\\*foo bar \\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 370 (Emphasis and strong emphasis)',
    markdown: '*(*foo)',
    canonical: '\\*(\\*foo)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 371 (Emphasis and strong emphasis)',
    markdown: '*(*foo*)*',
    canonical: '_(foo_)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 373 (Emphasis and strong emphasis)',
    markdown: '_foo bar _',
    canonical: '\\_foo bar \\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 374 (Emphasis and strong emphasis)',
    markdown: '_(_foo)',
    canonical: '\\_(\\_foo)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 375 (Emphasis and strong emphasis)',
    markdown: '_(_foo_)_',
    canonical: '_(foo_)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 376 (Emphasis and strong emphasis)',
    markdown: '_foo_bar',
    canonical: '\\_foo_bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 377 (Emphasis and strong emphasis)',
    markdown: '_пристаням_стремятся',
    canonical: '\\_пристаням\\_стремятся',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 378 (Emphasis and strong emphasis)',
    markdown: '_foo_bar_baz_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 379 (Emphasis and strong emphasis)',
    markdown: '_(bar)_.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 380 (Emphasis and strong emphasis)',
    markdown: '**foo bar**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 381 (Emphasis and strong emphasis)',
    markdown: '** foo bar**',
    canonical: '\\*\\* foo bar\\*\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 382 (Emphasis and strong emphasis)',
    markdown: 'a**"foo"**',
    canonical: 'a\\*\\*"foo"\\*\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 383 (Emphasis and strong emphasis)',
    markdown: 'foo**bar**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 384 (Emphasis and strong emphasis)',
    markdown: '__foo bar__',
    canonical: '**foo bar**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 385 (Emphasis and strong emphasis)',
    markdown: '__ foo bar__',
    canonical: '\\_\\_ foo bar_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 386 (Emphasis and strong emphasis)',
    markdown: '__\nfoo bar__',
    canonical: '\\_\\_ foo bar_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 387 (Emphasis and strong emphasis)',
    markdown: 'a__"foo"__',
    canonical: 'a_\\_"foo"\\_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 388 (Emphasis and strong emphasis)',
    markdown: 'foo__bar__',
    canonical: 'foo__bar_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 389 (Emphasis and strong emphasis)',
    markdown: '5__6__78',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 390 (Emphasis and strong emphasis)',
    markdown: 'пристаням__стремятся__',
    canonical: 'пристаням\\_\\_стремятся\\_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 391 (Emphasis and strong emphasis)',
    markdown: '__foo, __bar__, baz__',
    canonical: '**foo, bar**, baz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 392 (Emphasis and strong emphasis)',
    markdown: 'foo-__(bar)__',
    canonical: 'foo-**(bar)**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 393 (Emphasis and strong emphasis)',
    markdown: '**foo bar **',
    canonical: '\\*\\*foo bar \\*\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 394 (Emphasis and strong emphasis)',
    markdown: '**(**foo)',
    canonical: '\\*\\*(\\*\\*foo)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 395 (Emphasis and strong emphasis)',
    markdown: '*(**foo**)*',
    canonical: '_(**foo**)_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 396 (Emphasis and strong emphasis)',
    markdown:
      '**Gomphocarpus (*Gomphocarpus physocarpus*, syn.\n*Asclepias physocarpa*)**',
    canonical:
      '**Gomphocarpus (_Gomphocarpus physocarpus_, syn. _Asclepias physocarpa_)**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 397 (Emphasis and strong emphasis)',
    markdown: '**foo "*bar*" foo**',
    canonical: '**foo "_bar_" foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 398 (Emphasis and strong emphasis)',
    markdown: '**foo**bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 399 (Emphasis and strong emphasis)',
    markdown: '__foo bar __',
    canonical: '\\__foo bar \\_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 400 (Emphasis and strong emphasis)',
    markdown: '__(__foo)',
    canonical: '\\_\\_(\\__foo)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 401 (Emphasis and strong emphasis)',
    markdown: '_(__foo__)_',
    canonical: '_(**foo**)_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 402 (Emphasis and strong emphasis)',
    markdown: '__foo__bar',
    canonical: '\\__foo__bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 403 (Emphasis and strong emphasis)',
    markdown: '__пристаням__стремятся',
    canonical: '\\_\\_пристаням\\_\\_стремятся',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 404 (Emphasis and strong emphasis)',
    markdown: '__foo__bar__baz__',
    canonical: '**foo__bar__baz**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 405 (Emphasis and strong emphasis)',
    markdown: '__(bar)__.',
    canonical: '**(bar)**.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 406 (Emphasis and strong emphasis)',
    markdown: '*foo [bar](/url)*',
    canonical: '_foo [bar](/url)_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 407 (Emphasis and strong emphasis)',
    markdown: '*foo\nbar*',
    canonical: '_foo bar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 408 (Emphasis and strong emphasis)',
    markdown: '_foo __bar__ baz_',
    canonical: '_foo **bar** baz_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 409 (Emphasis and strong emphasis)',
    markdown: '_foo _bar_ baz_',
    canonical: '_foo bar_ baz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 410 (Emphasis and strong emphasis)',
    markdown: '__foo_ bar_',
    canonical: '_foo_ bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 411 (Emphasis and strong emphasis)',
    markdown: '*foo *bar**',
    canonical: '_foo bar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 412 (Emphasis and strong emphasis)',
    markdown: '*foo **bar** baz*',
    canonical: '_foo **bar** baz_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 413 (Emphasis and strong emphasis)',
    markdown: '*foo**bar**baz*',
    canonical: '_foo**bar**baz_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 414 (Emphasis and strong emphasis)',
    markdown: '*foo**bar*',
    canonical: '_foo\\*\\*bar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 416 (Emphasis and strong emphasis)',
    markdown: '*foo **bar***',
    canonical: '_foo **bar**_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 417 (Emphasis and strong emphasis)',
    markdown: '*foo**bar***',
    canonical: '_foo**bar**_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 419 (Emphasis and strong emphasis)',
    markdown: 'foo******bar*********baz',
    canonical: 'foo**bar**\\*\\*\\*baz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 421 (Emphasis and strong emphasis)',
    markdown: '*foo [*bar*](/url)*',
    canonical: '_foo [bar](/url)_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 422 (Emphasis and strong emphasis)',
    markdown: '** is not an empty emphasis',
    canonical: '\\*\\* is not an empty emphasis',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 423 (Emphasis and strong emphasis)',
    markdown: '**** is not an empty strong emphasis',
    canonical: '\\*\\*\\*\\* is not an empty strong emphasis',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 424 (Emphasis and strong emphasis)',
    markdown: '**foo [bar](/url)**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 425 (Emphasis and strong emphasis)',
    markdown: '**foo\nbar**',
    canonical: '**foo bar**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 426 (Emphasis and strong emphasis)',
    markdown: '__foo _bar_ baz__',
    canonical: '**foo _bar_ baz**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 427 (Emphasis and strong emphasis)',
    markdown: '__foo __bar__ baz__',
    canonical: '**foo bar** baz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 428 (Emphasis and strong emphasis)',
    markdown: '____foo__ bar__',
    canonical: '**foo** bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 429 (Emphasis and strong emphasis)',
    markdown: '**foo **bar****',
    canonical: '**foo bar**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 430 (Emphasis and strong emphasis)',
    markdown: '**foo *bar* baz**',
    canonical: '**foo _bar_ baz**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 432 (Emphasis and strong emphasis)',
    markdown: '***foo* bar**',
    canonical: '**_foo_ bar**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 433 (Emphasis and strong emphasis)',
    markdown: '**foo *bar***',
    canonical: '**foo _bar_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 435 (Emphasis and strong emphasis)',
    markdown: '**foo [*bar*](/url)**',
    canonical: '**foo _[bar](/url)_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 436 (Emphasis and strong emphasis)',
    markdown: '__ is not an empty emphasis',
    canonical: '\\_\\_ is not an empty emphasis',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 437 (Emphasis and strong emphasis)',
    markdown: '____ is not an empty strong emphasis',
    canonical: '\\___\\_ is not an empty strong emphasis',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 438 (Emphasis and strong emphasis)',
    markdown: 'foo ***',
    canonical: 'foo \\*\\*\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 439 (Emphasis and strong emphasis)',
    markdown: 'foo *\\**',
    canonical: 'foo _\\*_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 440 (Emphasis and strong emphasis)',
    markdown: 'foo *_*',
    canonical: 'foo _\\__',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 441 (Emphasis and strong emphasis)',
    markdown: 'foo *****',
    canonical: 'foo \\*\\*\\*\\*\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 442 (Emphasis and strong emphasis)',
    markdown: 'foo **\\***',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 443 (Emphasis and strong emphasis)',
    markdown: 'foo **_**',
    canonical: 'foo **\\_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 444 (Emphasis and strong emphasis)',
    markdown: '**foo*',
    canonical: '\\*_foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 445 (Emphasis and strong emphasis)',
    markdown: '*foo**',
    canonical: '_foo_\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 446 (Emphasis and strong emphasis)',
    markdown: '***foo**',
    canonical: '\\***foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 447 (Emphasis and strong emphasis)',
    markdown: '****foo*',
    canonical: '\\*\\*\\*_foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 448 (Emphasis and strong emphasis)',
    markdown: '**foo***',
    canonical: '**foo**\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 449 (Emphasis and strong emphasis)',
    markdown: '*foo****',
    canonical: '_foo_\\*\\*\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 450 (Emphasis and strong emphasis)',
    markdown: 'foo ___',
    canonical: 'foo \\__\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 451 (Emphasis and strong emphasis)',
    markdown: 'foo _\\__',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 452 (Emphasis and strong emphasis)',
    markdown: 'foo _*_',
    canonical: 'foo _\\*_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 453 (Emphasis and strong emphasis)',
    markdown: 'foo _____',
    canonical: 'foo \\____\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 454 (Emphasis and strong emphasis)',
    markdown: 'foo __\\___',
    canonical: 'foo **\\_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 455 (Emphasis and strong emphasis)',
    markdown: 'foo __*__',
    canonical: 'foo **\\***',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 456 (Emphasis and strong emphasis)',
    markdown: '__foo_',
    canonical: '\\__foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 457 (Emphasis and strong emphasis)',
    markdown: '_foo__',
    canonical: '_foo_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 458 (Emphasis and strong emphasis)',
    markdown: '___foo__',
    canonical: '\\_**foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 459 (Emphasis and strong emphasis)',
    markdown: '____foo_',
    canonical: '\\__\\__foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 460 (Emphasis and strong emphasis)',
    markdown: '__foo___',
    canonical: '**foo**\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 461 (Emphasis and strong emphasis)',
    markdown: '_foo____',
    canonical: '_foo_\\__\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 462 (Emphasis and strong emphasis)',
    markdown: '**foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 463 (Emphasis and strong emphasis)',
    markdown: '*_foo_*',
    canonical: '_foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 464 (Emphasis and strong emphasis)',
    markdown: '__foo__',
    canonical: '**foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 465 (Emphasis and strong emphasis)',
    markdown: '_*foo*_',
    canonical: '_foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 466 (Emphasis and strong emphasis)',
    markdown: '****foo****',
    canonical: '**foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 467 (Emphasis and strong emphasis)',
    markdown: '____foo____',
    canonical: '**foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 468 (Emphasis and strong emphasis)',
    markdown: '******foo******',
    canonical: '**foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 469 (Emphasis and strong emphasis)',
    markdown: '***foo***',
    canonical: '**_foo_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 470 (Emphasis and strong emphasis)',
    markdown: '_____foo_____',
    canonical: '**_foo_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 471 (Emphasis and strong emphasis)',
    markdown: '*foo _bar* baz_',
    canonical: '_foo \\_bar_ baz\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 472 (Emphasis and strong emphasis)',
    markdown: '*foo __bar *baz bim__ bam*',
    canonical: '_foo **bar \\*baz bim** bam_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 473 (Emphasis and strong emphasis)',
    markdown: '**foo **bar baz**',
    canonical: '\\*\\*foo **bar baz**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 474 (Emphasis and strong emphasis)',
    markdown: '*foo *bar baz*',
    canonical: '\\*foo _bar baz_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 475 (Emphasis and strong emphasis)',
    markdown: '*[bar*](/url)',
    canonical: '\\*[bar\\*](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 476 (Emphasis and strong emphasis)',
    markdown: '_foo [bar_](/url)',
    canonical: '\\_foo [bar\\_](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 477 (Emphasis and strong emphasis)',
    markdown: '*<img src="foo" title="*"/>',
    canonical: '_<img src="foo" title="_"/>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 478 (Emphasis and strong emphasis)',
    markdown: '**<a href="**">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 479 (Emphasis and strong emphasis)',
    markdown: '__<a href="__">',
    canonical: '**<a href="**">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 480 (Emphasis and strong emphasis)',
    markdown: '*a `*`*',
    canonical: '_a `*`_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 481 (Emphasis and strong emphasis)',
    markdown: '_a `_`_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 482 (Emphasis and strong emphasis)',
    markdown: '**a<https://foo.bar/?q=**>',
    canonical: '\\*\\*a<https://foo.bar/?q=**>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 483 (Emphasis and strong emphasis)',
    markdown: '__a<https://foo.bar/?q=__>',
    canonical: '\\__a<https://foo.bar/?q=__>',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Links ---
  {
    name: 'commonmark 0.31.2 ex 484 (Links)',
    markdown: '[link](/uri "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 485 (Links)',
    markdown: '[link](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 487 (Links)',
    markdown: '[link]()',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 488 (Links)',
    markdown: '[link](<>)',
    canonical: '[link]()',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 490 (Links)',
    markdown: '[link](/my uri)',
    canonical: '\\[link\\](/my uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 491 (Links)',
    markdown: '[link](</my uri>)',
    canonical: '[link](/my%20uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 492 (Links)',
    markdown: '[link](foo\nbar)',
    canonical: '\\[link\\](foo bar)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 493 (Links)',
    markdown: '[link](<foo\nbar>)',
    canonical: '\\[link\\](<foo bar>)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 495 (Links)',
    markdown: '[link](<foo\\>)',
    canonical: '\\[link\\](<foo>)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 496 (Links)',
    markdown: '[a](<b)c\n[a](<b)c>\n[a](<b>c)',
    canonical: '\\[a\\](<b)c \\[a\\](<b)c> \\[a\\](<b>c)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 497 (Links)',
    markdown: '[link](\\(foo\\))',
    canonical: '[link]((foo))',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 498 (Links)',
    markdown: '[link](foo(and(bar)))',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 499 (Links)',
    markdown: '[link](foo(and(bar))',
    canonical: '\\[link\\](foo(and(bar))',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 503 (Links)',
    markdown:
      '[link](#fragment)\n\n[link](https://example.com#fragment)\n\n[link](https://example.com?foo=3#frag)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 504 (Links)',
    markdown: '[link](foo\\bar)',
    canonical: '[link](foo%5Cbar)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 505 (Links)',
    markdown: '[link](foo%20b&auml;)',
    canonical: '[link](foo%20b%C3%A4)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 506 (Links)',
    markdown: '[link]("title")',
    canonical: '[link](%22title%22)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 507 (Links)',
    markdown:
      '[link](/url "title")\n[link](/url \'title\')\n[link](/url (title))',
    canonical: '[link](/url "title") [link](/url "title") [link](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 508 (Links)',
    markdown: '[link](/url "title \\"&quot;")',
    canonical: '[link](/url \'title ""\')',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 509 (Links)',
    markdown: '[link](/url "title")',
    canonical: '[link](/url%C2%A0%22title%22)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 510 (Links)',
    markdown: '[link](/url "title "and" title")',
    canonical: '\\[link\\](/url "title "and" title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 511 (Links)',
    markdown: '[link](/url \'title "and" title\')',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 512 (Links)',
    markdown: '[link](   /uri\n  "title"  )',
    canonical: '[link](/uri "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 513 (Links)',
    markdown: '[link] (/uri)',
    canonical: '\\[link\\] (/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 514 (Links)',
    markdown: '[link [foo [bar]]](/uri)',
    canonical: '[link \\[foo \\[bar\\]\\]](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 515 (Links)',
    markdown: '[link] bar](/uri)',
    canonical: '\\[link\\] bar\\](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 516 (Links)',
    markdown: '[link [bar](/uri)',
    canonical: '\\[link [bar](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 517 (Links)',
    markdown: '[link \\[bar](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 519 (Links)',
    markdown: '[![moon](moon.jpg)](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 520 (Links)',
    markdown: '[foo [bar](/uri)](/uri)',
    canonical: '\\[foo [bar](/uri)\\](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 521 (Links)',
    markdown: '[foo *[bar [baz](/uri)](/uri)*](/uri)',
    canonical: '\\[foo _\\[bar [baz](/uri)\\](/uri)_\\](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 522 (Links)',
    markdown: '![[[foo](uri1)](uri2)](uri3)',
    canonical: '![\\[foo\\](uri2)](uri3)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 523 (Links)',
    markdown: '*[foo*](/uri)',
    canonical: '\\*[foo\\*](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 524 (Links)',
    markdown: '[foo *bar](baz*)',
    canonical: '[foo \\*bar](baz\\*)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 525 (Links)',
    markdown: '*foo [bar* baz]',
    canonical: '_foo \\[bar_ baz\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 526 (Links)',
    markdown: '[foo <bar attr="](baz)">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 527 (Links)',
    markdown: '[foo`](/uri)`',
    canonical: '\\[foo`](/uri)`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 528 (Links)',
    markdown: '[foo<https://example.com/?search=](uri)>',
    canonical:
      '\\[foo[https://example.com/?search=\\](uri)](https://example.com/?search=%5D(uri))',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 529 (Links)',
    markdown: '[foo][bar]\n\n[bar]: /url "title"',
    canonical: '[foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 530 (Links)',
    markdown: '[link [foo [bar]]][ref]\n\n[ref]: /uri',
    canonical: '[link \\[foo \\[bar\\]\\]](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 531 (Links)',
    markdown: '[link \\[bar][ref]\n\n[ref]: /uri',
    canonical: '[link \\[bar](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 533 (Links)',
    markdown: '[![moon](moon.jpg)][ref]\n\n[ref]: /uri',
    canonical: '[![moon](moon.jpg)](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 534 (Links)',
    markdown: '[foo [bar](/uri)][ref]\n\n[ref]: /uri',
    canonical: '\\[foo [bar](/uri)\\][ref](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 535 (Links)',
    markdown: '[foo *bar [baz][ref]*][ref]\n\n[ref]: /uri',
    canonical: '\\[foo _bar [baz](/uri)_\\][ref](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 536 (Links)',
    markdown: '*[foo*][ref]\n\n[ref]: /uri',
    canonical: '\\*[foo\\*](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 537 (Links)',
    markdown: '[foo *bar][ref]*\n\n[ref]: /uri',
    canonical: '[foo \\*bar](/uri)\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 538 (Links)',
    markdown: '[foo <bar attr="][ref]">\n\n[ref]: /uri',
    canonical: '[foo <bar attr="](/uri)">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 539 (Links)',
    markdown: '[foo`][ref]`\n\n[ref]: /uri',
    canonical: '\\[foo`][ref]`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 540 (Links)',
    markdown: '[foo<https://example.com/?search=][ref]>\n\n[ref]: /uri',
    canonical:
      '\\[foo[https://example.com/?search=\\]\\[ref\\]](https://example.com/?search=%5D%5Bref%5D)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 541 (Links)',
    markdown: '[foo][BaR]\n\n[bar]: /url "title"',
    canonical: '[foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 542 (Links)',
    markdown: '[ẞ]\n\n[SS]: /url',
    canonical: '[ẞ](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 543 (Links)',
    markdown: '[Foo\n  bar]: /url\n\n[Baz][Foo bar]',
    canonical: '[Baz](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 544 (Links)',
    markdown: '[foo] [bar]\n\n[bar]: /url "title"',
    canonical: '\\[foo\\] [bar](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 545 (Links)',
    markdown: '[foo]\n[bar]\n\n[bar]: /url "title"',
    canonical: '\\[foo\\] [bar](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 546 (Links)',
    markdown: '[foo]: /url1\n\n[foo]: /url2\n\n[bar][foo]',
    canonical: '[bar](/url1)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 547 (Links)',
    markdown: '[bar][foo\\!]\n\n[foo!]: /url',
    canonical: '\\[bar\\]\\[foo!\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 548 (Links)',
    markdown: '[foo][ref[]\n\n[ref[]: /uri',
    canonical: '\\[foo\\]\\[ref\\[\\]\n\n\\[ref\\[\\]: /uri',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 549 (Links)',
    markdown: '[foo][ref[bar]]\n\n[ref[bar]]: /uri',
    canonical: '\\[foo\\]\\[ref\\[bar\\]\\]\n\n\\[ref\\[bar\\]\\]: /uri',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 550 (Links)',
    markdown: '[[[foo]]]\n\n[[[foo]]]: /url',
    canonical: '\\[\\[\\[foo\\]\\]\\]\n\n\\[\\[\\[foo\\]\\]\\]: /url',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 551 (Links)',
    markdown: '[foo][ref\\[]\n\n[ref\\[]: /uri',
    canonical: '[foo](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 552 (Links)',
    markdown: '[bar\\\\]: /uri\n\n[bar\\\\]',
    canonical: '[bar\\\\](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 553 (Links)',
    markdown: '[]\n\n[]: /uri',
    canonical: '\\[\\]\n\n\\[\\]: /uri',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 554 (Links)',
    markdown: '[\n ]\n\n[\n ]: /uri',
    canonical: '\\[ \\]\n\n\\[ \\]: /uri',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 555 (Links)',
    markdown: '[foo][]\n\n[foo]: /url "title"',
    canonical: '[foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 556 (Links)',
    markdown: '[*foo* bar][]\n\n[*foo* bar]: /url "title"',
    canonical: '_[foo](/url "title")_[ bar](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 557 (Links)',
    markdown: '[Foo][]\n\n[foo]: /url "title"',
    canonical: '[Foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 558 (Links)',
    markdown: '[foo] \n[]\n\n[foo]: /url "title"',
    canonical: '[foo](/url "title") \\[\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 559 (Links)',
    markdown: '[foo]\n\n[foo]: /url "title"',
    canonical: '[foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 560 (Links)',
    markdown: '[*foo* bar]\n\n[*foo* bar]: /url "title"',
    canonical: '_[foo](/url "title")_[ bar](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 561 (Links)',
    markdown: '[[*foo* bar]]\n\n[*foo* bar]: /url "title"',
    canonical: '[[*foo* bar]]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 562 (Links)',
    markdown: '[[bar [foo]\n\n[foo]: /url',
    canonical: '\\[\\[bar [foo](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 563 (Links)',
    markdown: '[Foo]\n\n[foo]: /url "title"',
    canonical: '[Foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 564 (Links)',
    markdown: '[foo] bar\n\n[foo]: /url',
    canonical: '[foo](/url) bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 565 (Links)',
    markdown: '\\[foo]\n\n[foo]: /url "title"',
    canonical: '\\[foo\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 566 (Links)',
    markdown: '[foo*]: /url\n\n*[foo*]',
    canonical: '\\*[foo\\*](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 567 (Links)',
    markdown: '[foo][bar]\n\n[foo]: /url1\n[bar]: /url2',
    canonical: '[foo](/url2)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 568 (Links)',
    markdown: '[foo][]\n\n[foo]: /url1',
    canonical: '[foo](/url1)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 569 (Links)',
    markdown: '[foo]()\n\n[foo]: /url1',
    canonical: '[foo]()',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 570 (Links)',
    markdown: '[foo](not a link)\n\n[foo]: /url1',
    canonical: '[foo](/url1)(not a link)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 571 (Links)',
    markdown: '[foo][bar][baz]\n\n[baz]: /url',
    canonical: '\\[foo\\][bar](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 572 (Links)',
    markdown: '[foo][bar][baz]\n\n[baz]: /url1\n[bar]: /url2',
    canonical: '[foo](/url2)[baz](/url1)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 573 (Links)',
    markdown: '[foo][bar][baz]\n\n[baz]: /url1\n[foo]: /url2',
    canonical: '\\[foo\\][bar](/url1)',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Images ---
  {
    name: 'commonmark 0.31.2 ex 574 (Images)',
    markdown: '![foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 575 (Images)',
    markdown: '![foo *bar*]\n\n[foo *bar*]: train.jpg "train & tracks"',
    canonical: '![foo bar](train.jpg "train & tracks")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 576 (Images)',
    markdown: '![foo ![bar](/url)](/url2)',
    canonical: '![foo bar](/url2)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 577 (Images)',
    markdown: '![foo [bar](/url)](/url2)',
    canonical: '![foo bar](/url2)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 578 (Images)',
    markdown: '![foo *bar*][]\n\n[foo *bar*]: train.jpg "train & tracks"',
    canonical: '![foo bar](train.jpg "train & tracks")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 579 (Images)',
    markdown: '![foo *bar*][foobar]\n\n[FOOBAR]: train.jpg "train & tracks"',
    canonical: '![foo bar](train.jpg "train & tracks")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 580 (Images)',
    markdown: '![foo](train.jpg)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 581 (Images)',
    markdown: 'My ![foo bar](/path/to/train.jpg  "title"   )',
    canonical: 'My ![foo bar](/path/to/train.jpg "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 582 (Images)',
    markdown: '![foo](<url>)',
    canonical: '![foo](url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 583 (Images)',
    markdown: '![](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 584 (Images)',
    markdown: '![foo][bar]\n\n[bar]: /url',
    canonical: '![foo](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 585 (Images)',
    markdown: '![foo][bar]\n\n[BAR]: /url',
    canonical: '![foo](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 586 (Images)',
    markdown: '![foo][]\n\n[foo]: /url "title"',
    canonical: '![foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 587 (Images)',
    markdown: '![*foo* bar][]\n\n[*foo* bar]: /url "title"',
    canonical: '![foo bar](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 588 (Images)',
    markdown: '![Foo][]\n\n[foo]: /url "title"',
    canonical: '![Foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 589 (Images)',
    markdown: '![foo] \n[]\n\n[foo]: /url "title"',
    canonical: '![foo](/url "title") \\[\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 590 (Images)',
    markdown: '![foo]\n\n[foo]: /url "title"',
    canonical: '![foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 591 (Images)',
    markdown: '![*foo* bar]\n\n[*foo* bar]: /url "title"',
    canonical: '![foo bar](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 592 (Images)',
    markdown: '![[foo]]\n\n[[foo]]: /url "title"',
    canonical: '\\![[foo]]\n\n[[foo]]: /url "title"',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 593 (Images)',
    markdown: '![Foo]\n\n[foo]: /url "title"',
    canonical: '![Foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 594 (Images)',
    markdown: '!\\[foo]\n\n[foo]: /url "title"',
    canonical: '!\\[foo\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 595 (Images)',
    markdown: '\\![foo]\n\n[foo]: /url "title"',
    canonical: '\\![foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Autolinks ---
  {
    name: 'commonmark 0.31.2 ex 596 (Autolinks)',
    markdown: '<http://foo.bar.baz>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 597 (Autolinks)',
    markdown: '<https://foo.bar.baz/test?q=hello&id=22&boolean>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 598 (Autolinks)',
    markdown: '<irc://foo.bar:2233/baz>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 599 (Autolinks)',
    markdown: '<MAILTO:FOO@BAR.BAZ>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 600 (Autolinks)',
    markdown: '<a+b+c:d>',
    canonical: '[a+b+c:d](a+b+c:d)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 601 (Autolinks)',
    markdown: '<made-up-scheme://foo,bar>',
    canonical: '[made-up-scheme://foo,bar](made-up-scheme://foo,bar)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 602 (Autolinks)',
    markdown: '<https://../>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 603 (Autolinks)',
    markdown: '<localhost:5001/foo>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 604 (Autolinks)',
    markdown: '<https://foo.bar/baz bim>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 605 (Autolinks)',
    markdown: '<https://example.com/\\[\\>',
    canonical:
      '[https://example.com/\\\\\\[\\\\](https://example.com/%5C%5B%5C)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 606 (Autolinks)',
    markdown: '<foo@bar.example.com>',
    canonical: '[foo@bar.example.com](mailto:foo@bar.example.com)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 607 (Autolinks)',
    markdown: '<foo+special@Bar.baz-bar0.com>',
    canonical:
      '[foo+special@Bar.baz-bar0.com](mailto:foo+special@Bar.baz-bar0.com)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 609 (Autolinks)',
    markdown: '<>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 610 (Autolinks)',
    markdown: '< https://foo.bar >',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 611 (Autolinks)',
    markdown: '<m:abc>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 612 (Autolinks)',
    markdown: '<foo.bar.baz>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 613 (Autolinks)',
    markdown: 'https://example.com',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 614 (Autolinks)',
    markdown: 'foo@bar.example.com',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Raw HTML ---
  {
    name: 'commonmark 0.31.2 ex 615 (Raw HTML)',
    markdown: '<a><bab><c2c>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 616 (Raw HTML)',
    markdown: '<a/><b2/>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 619 (Raw HTML)',
    markdown: 'Foo <responsive-image src="foo.jpg" />',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 622 (Raw HTML)',
    markdown: "<a href=\"hi'> <a href=hi'>",
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 624 (Raw HTML)',
    markdown: "<a href='bar'title=title>",
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 625 (Raw HTML)',
    markdown: '</a></foo >',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 626 (Raw HTML)',
    markdown: '</a href="foo">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 628 (Raw HTML)',
    markdown: 'foo <!--> foo -->\n\nfoo <!---> foo -->',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 629 (Raw HTML)',
    markdown: 'foo <?php echo $a; ?>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 630 (Raw HTML)',
    markdown: 'foo <!ELEMENT br EMPTY>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 633 (Raw HTML)',
    markdown: 'foo <a href="\\*">',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Hard line breaks ---
  {
    name: 'commonmark 0.31.2 ex 636 (Hard line breaks)',
    markdown: 'foo  \nbaz',
    canonical: 'foo\\\nbaz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 637 (Hard line breaks)',
    markdown: 'foo\\\nbaz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 638 (Hard line breaks)',
    markdown: 'foo       \nbaz',
    canonical: 'foo\\\nbaz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 639 (Hard line breaks)',
    markdown: 'foo  \n     bar',
    canonical: 'foo\\\nbar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 640 (Hard line breaks)',
    markdown: 'foo\\\n     bar',
    canonical: 'foo\\\nbar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 641 (Hard line breaks)',
    markdown: '*foo  \nbar*',
    canonical: '_foo\\\nbar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 642 (Hard line breaks)',
    markdown: '*foo\\\nbar*',
    canonical: '_foo\\\nbar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 643 (Hard line breaks)',
    markdown: '`code  \nspan`',
    canonical: '`code   span`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 644 (Hard line breaks)',
    markdown: '`code\\\nspan`',
    canonical: '`code\\ span`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 645 (Hard line breaks)',
    markdown: '<a href="foo  \nbar">',
    canonical: '<a href="foo\\\nbar">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 646 (Hard line breaks)',
    markdown: '<a href="foo\\\nbar">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 647 (Hard line breaks)',
    markdown: 'foo\\',
    canonical: 'foo\\\\',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 648 (Hard line breaks)',
    markdown: 'foo  ',
    canonical: 'foo',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 649 (Hard line breaks)',
    markdown: '### foo\\',
    canonical: '### foo\\\\',
    engines: BOTH_ENGINES,
  },
  // --- commonmark 0.31.2 — Textual content ---
  {
    name: 'commonmark 0.31.2 ex 653 (Textual content)',
    markdown: "hello $.;'there",
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 654 (Textual content)',
    markdown: 'Foo χρῆν',
    engines: BOTH_ENGINES,
  },
  {
    name: 'commonmark 0.31.2 ex 655 (Textual content)',
    markdown: 'Multiple     spaces',
    engines: BOTH_ENGINES,
  },
  // --- gfm 0.29 — Task list items (extension) ---
  {
    name: 'gfm 0.29 ex 279 (Task list items (extension))',
    markdown: '- [ ] foo\n- [x] bar',
    canonical: '- [ ] foo\n\n- [x] bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 280 (Task list items (extension))',
    markdown: '- [x] foo\n  - [ ] bar\n  - [x] baz\n- [ ] bim',
    canonical: '- [x] foo\n\n  - [ ] bar\n\n  - [x] baz\n\n- [ ] bim',
    engines: BOTH_ENGINES,
  },
  // --- gfm 0.29 — Entity and numeric character references ---
  {
    name: 'gfm 0.29 ex 324 (Entity and numeric character references)',
    markdown:
      '&nbsp &x; &#; &#x;\n&#987654321;\n&#abcdef0;\n&ThisIsNotDefined; &hi?;',
    canonical:
      '&nbsp &x; &#; &#x; &#987654321; &#abcdef0; &ThisIsNotDefined; &hi?;',
    engines: BOTH_ENGINES,
  },
  // --- gfm 0.29 — Code spans ---
  {
    name: 'gfm 0.29 ex 355 (Code spans)',
    markdown: '`<http://foo.bar.`baz>`',
    canonical: '`<http://foo.bar.`baz>\\`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 356 (Code spans)',
    markdown: '<http://foo.bar.`baz>`',
    canonical: '[http://foo.bar.\\`baz](http://foo.bar.%60baz)\\`',
    engines: BOTH_ENGINES,
  },
  // --- gfm 0.29 — Emphasis and strong emphasis ---
  {
    name: 'gfm 0.29 ex 489 (Emphasis and strong emphasis)',
    markdown: '**a<http://foo.bar/?q=**>',
    canonical: '\\*\\*a<http://foo.bar/?q=**>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 490 (Emphasis and strong emphasis)',
    markdown: '__a<http://foo.bar/?q=__>',
    canonical: '\\__a<http://foo.bar/?q=__>',
    engines: BOTH_ENGINES,
  },
  // --- gfm 0.29 — Strikethrough (extension) ---
  {
    name: 'gfm 0.29 ex 491 (Strikethrough (extension))',
    markdown: '~~Hi~~ Hello, world!',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 492 (Strikethrough (extension))',
    markdown: 'This ~~has a\n\nnew paragraph~~.',
    canonical: 'This \\~\\~has a\n\nnew paragraph\\~\\~.',
    engines: BOTH_ENGINES,
  },
  // --- gfm 0.29 — Links ---
  {
    name: 'gfm 0.29 ex 509 (Links)',
    markdown:
      '[link](#fragment)\n\n[link](http://example.com#fragment)\n\n[link](http://example.com?foo=3#frag)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 534 (Links)',
    markdown: '[foo<http://example.com/?search=](uri)>',
    canonical:
      '\\[foo[http://example.com/?search=\\](uri)](http://example.com/?search=%5D(uri))',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 543 (Links)',
    markdown: '[foo *bar][ref]\n\n[ref]: /uri',
    canonical: '[foo \\*bar](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 546 (Links)',
    markdown: '[foo<http://example.com/?search=][ref]>\n\n[ref]: /uri',
    canonical:
      '\\[foo[http://example.com/?search=\\]\\[ref\\]](http://example.com/?search=%5D%5Bref%5D)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 548 (Links)',
    markdown: '[Толпой][Толпой] is a Russian word.\n\n[ТОЛПОЙ]: /url',
    canonical: '[Толпой](/url) is a Russian word.',
    engines: BOTH_ENGINES,
  },
  // --- gfm 0.29 — Autolinks ---
  {
    name: 'gfm 0.29 ex 603 (Autolinks)',
    markdown: '<http://foo.bar.baz/test?q=hello&id=22&boolean>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 608 (Autolinks)',
    markdown: '<http://../>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 610 (Autolinks)',
    markdown: '<http://foo.bar/baz bim>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 611 (Autolinks)',
    markdown: '<http://example.com/\\[\\>',
    canonical: '[http://example.com/\\\\\\[\\\\](http://example.com/%5C%5B%5C)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 616 (Autolinks)',
    markdown: '< http://foo.bar >',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 619 (Autolinks)',
    markdown: 'http://example.com',
    engines: BOTH_ENGINES,
  },
  // --- gfm 0.29 — Autolinks (extension) ---
  {
    name: 'gfm 0.29 ex 621 (Autolinks (extension))',
    markdown: 'www.commonmark.org',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 622 (Autolinks (extension))',
    markdown: 'Visit www.commonmark.org/help for more information.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 623 (Autolinks (extension))',
    markdown: 'Visit www.commonmark.org.\n\nVisit www.commonmark.org/a.b.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 624 (Autolinks (extension))',
    markdown:
      'www.google.com/search?q=Markup+(business)\n\nwww.google.com/search?q=Markup+(business)))\n\n(www.google.com/search?q=Markup+(business))\n\n(www.google.com/search?q=Markup+(business)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 625 (Autolinks (extension))',
    markdown: 'www.google.com/search?q=(business))+ok',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 626 (Autolinks (extension))',
    markdown:
      'www.google.com/search?q=commonmark&hl=en\n\nwww.google.com/search?q=commonmark&hl;',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 627 (Autolinks (extension))',
    markdown: 'www.commonmark.org/he<lp',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 628 (Autolinks (extension))',
    markdown:
      'http://commonmark.org\n\n(Visit https://encrypted.google.com/search?q=Markup+(business))\n\nAnonymous FTP is available at ftp://foo.bar.baz.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 629 (Autolinks (extension))',
    markdown: 'foo@bar.baz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 630 (Autolinks (extension))',
    markdown:
      "hello@mail+xyz.example isn't valid, but hello+xyz@mail.example is.",
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm 0.29 ex 631 (Autolinks (extension))',
    markdown: 'a.b-c_d@a.b\n\na.b-c_d@a.b.\n\na.b-c_d@a.b-\n\na.b-c_d@a.b_',
    canonical: 'a.b-c_d@a.b\n\na.b-c_d@a.b.\n\na.b-c_d@a.b-\n\na.b-c_d@a.b\\_',
    engines: BOTH_ENGINES,
  },
  // --- gfm extensions — Strikethroughs ---
  {
    name: 'gfm extensions ex 17 (Strikethroughs)',
    markdown: 'A proper ~strikethrough~.',
    canonical: 'A proper \\~strikethrough\\~.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm extensions ex 18 (Strikethroughs)',
    markdown:
      "These are ~not strikethroughs.\n\nNo, they are not~\n\nThis ~is ~ legit~ isn't ~ legit.\n\nThis is not ~~~~~one~~~~~ huge strikethrough.\n\n~one~ ~~two~~ ~~~three~~~\n\nNo ~mismatch~~",
    canonical:
      "These are \\~not strikethroughs.\n\nNo, they are not\\~\n\nThis \\~is \\~ legit\\~ isn't \\~ legit.\n\nThis is not \\~~~one~~\\~ huge strikethrough.\n\n\\~one\\~ ~~two~~ \\~~~three~~\\~\n\nNo \\~mismatch\\~\\~",
    engines: BOTH_ENGINES,
  },
  // --- gfm extensions — Autolinks ---
  {
    name: 'gfm extensions ex 19 (Autolinks)',
    markdown:
      ": http://google.com https://google.com\n\n<http://google.com/å> http://google.com/å\n\nscyther@pokemon.com\n\nscy.the_rbe-edr+ill@pokemon.com\n\nscyther@pokemon.com.\n\nscyther@pokemon.com/\n\nscyther@pokemon.com/beedrill@pokemon.com\n\nmailto:scyther@pokemon.com\n\nThis is a mailto:scyther@pokemon.com\n\nmailto:scyther@pokemon.com.\n\nmmmmailto:scyther@pokemon.com\n\nmailto:scyther@pokemon.com/\n\nmailto:scyther@pokemon.com/message\n\nmailto:scyther@pokemon.com/mailto:beedrill@pokemon.com\n\nxmpp:scyther@pokemon.com\n\nxmpp:scyther@pokemon.com.\n\nxmpp:scyther@pokemon.com/message\n\nxmpp:scyther@pokemon.com/message.\n\nEmail me at:scyther@pokemon.com\n\nwww.github.com www.github.com/á\n\nwww.google.com/a_b\n\nUnderscores not allowed in host name www.xxx.yyy._zzz\n\nUnderscores not allowed in host name www.xxx._yyy.zzz\n\nUnderscores allowed in domain name www._xxx.yyy.zzz\n\n**Autolink and http://inlines**\n\n![http://inline.com/image](http://inline.com/image)\n\na.w@b.c\n\nFull stop outside parens shouldn't be included http://google.com/ok.\n\n(Full stop inside parens shouldn't be included http://google.com/ok.)\n\n\"http://google.com\"\n\n'http://google.com'\n\nhttp://🍄.ga/ http://x🍄.ga/",
    canonical:
      ": http://google.com https://google.com\n\n[http://google.com/å](http://google.com/%C3%A5) http://google.com/å\n\nscyther@pokemon.com\n\nscy.the_rbe-edr+ill@pokemon.com\n\nscyther@pokemon.com.\n\nscyther@pokemon.com/\n\nscyther@pokemon.com/beedrill@pokemon.com\n\nmailto:scyther@pokemon.com\n\nThis is a mailto:scyther@pokemon.com\n\nmailto:scyther@pokemon.com.\n\nmmmmailto:scyther@pokemon.com\n\nmailto:scyther@pokemon.com/\n\nmailto:scyther@pokemon.com/message\n\nmailto:scyther@pokemon.com/mailto:beedrill@pokemon.com\n\nxmpp:scyther@pokemon.com\n\nxmpp:scyther@pokemon.com.\n\nxmpp:scyther@pokemon.com/message\n\nxmpp:scyther@pokemon.com/message.\n\nEmail me at:scyther@pokemon.com\n\nwww.github.com www.github.com/á\n\nwww.google.com/a_b\n\nUnderscores not allowed in host name www.xxx.yyy.\\_zzz\n\nUnderscores not allowed in host name www.xxx.\\_yyy.zzz\n\nUnderscores allowed in domain name www.\\_xxx.yyy.zzz\n\n**Autolink and http://inlines**\n\n![http://inline.com/image](http://inline.com/image)\n\na.w@b.c\n\nFull stop outside parens shouldn't be included http://google.com/ok.\n\n(Full stop inside parens shouldn't be included http://google.com/ok.)\n\n\"http://google.com\"\n\n'http://google.com'\n\nhttp://🍄.ga/ http://x🍄.ga/",
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm extensions ex 20 (Autolinks)',
    markdown: "This shouldn't crash everything: (_A_@_.A",
    canonical: "This shouldn't crash everything: (_A_@\\_.A",
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm extensions ex 21 (Autolinks)',
    markdown: 'These should not link:\n\n* @a.b.c@. x\n* n@.  b',
    canonical: 'These should not link:\n\n- @a.b.c@. x\n\n- n@.  b',
    engines: BOTH_ENGINES,
  },
  // --- gfm extensions — Interop ---
  {
    name: 'gfm extensions ex 26 (Interop)',
    markdown: '~~www.google.com~~\n\n~~http://google.com~~',
    engines: BOTH_ENGINES,
  },
  // --- gfm extensions — Task lists ---
  {
    name: 'gfm extensions ex 29 (Task lists)',
    markdown:
      '- [x] foo\n  - [ ] bar\n  - [x] baz\n- [ ] bim\n\nShow a regular (non task) list to show that it has the same structure\n- [@] foo\n  - [@] bar\n  - [@] baz\n- [@] bim',
    canonical:
      '- [x] foo\n\n  - [ ] bar\n\n  - [x] baz\n\n- [ ] bim\n\nShow a regular (non task) list to show that it has the same structure\n\n- \\[@\\] foo\n\n  - \\[@\\] bar\n\n  - \\[@\\] baz\n\n- \\[@\\] bim',
    engines: BOTH_ENGINES,
  },
  {
    name: 'gfm extensions ex 30 (Task lists)',
    markdown:
      '- [x] foo\n    - [ ] bar\n    - [x] baz\n- [ ] bim\n\nShow a regular (non task) list to show that it has the same structure\n- [@] foo\n    - [@] bar\n    - [@] baz\n- [@] bim',
    canonical:
      '- [x] foo\n\n  - [ ] bar\n\n  - [x] baz\n\n- [ ] bim\n\nShow a regular (non task) list to show that it has the same structure\n\n- \\[@\\] foo\n\n  - \\[@\\] bar\n\n  - \\[@\\] baz\n\n- \\[@\\] bim',
    engines: BOTH_ENGINES,
  },
];
