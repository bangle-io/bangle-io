import type { MarkdownCorpusFixture } from './markdown-corpus';

/**
 * Spec-derived companion to `MARKDOWN_CORPUS` (same contract, same
 * two-engine gate): example *inputs* taken from the CommonMark spec
 * (`spec.txt`, 0.31) and the GFM spec + extension tests, mechanically
 * filtered to the entries both editor engines already handle identically:
 *
 * - "input" fixtures round-trip byte-identically (`serialize(parse(x)) === x`)
 *   in BOTH engines, and
 * - "canonical" fixtures normalize to the SAME bytes in both engines, and
 *   that canonical form is itself a fixed point in both.
 *
 * Only the spec's Markdown inputs are used; its HTML outputs are irrelevant
 * here. Sections are limited to inline constructs (marks, links, images,
 * code spans, autolinks, breaks, escapes) plus the byte-stable subset of
 * the block examples — the inline-mark interaction space is where mark
 * exclusion/ordering bugs (e.g. a link silently dropped from
 * `` [`code` text](url) ``) live.
 *
 * This file is generated-then-checked-in data: do not hand-tune expected
 * bytes to make a failure pass. A failure means an engine's round trip
 * drifted (or the two engines diverged) — fix the engine, or, for a
 * deliberate serializer change, regenerate by sweeping the spec corpora
 * through both engines and re-filtering (see the golden-corpus specs for
 * the round-trip harnesses).
 */

const BOTH_ENGINES: ReadonlyArray<'prosemirror' | 'wordgard'> = [
  'prosemirror',
  'wordgard',
];

export const MARKDOWN_SPEC_CORPUS: readonly MarkdownCorpusFixture[] = [
  // ===== Byte-stable spec inputs (round-trip unchanged) =====

  // --- Autolinks ---
  {
    name: 'Autolinks input 1',
    markdown: '<http://foo.bar.baz>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 2',
    markdown: '<https://foo.bar.baz/test?q=hello&id=22&boolean>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 3',
    markdown: '<irc://foo.bar:2233/baz>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 4',
    markdown: '<MAILTO:FOO@BAR.BAZ>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 5',
    markdown: '<https://../>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 6',
    markdown: '<localhost:5001/foo>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 7',
    markdown: '<https://foo.bar/baz bim>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 8',
    markdown: '<>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 9',
    markdown: '< https://foo.bar >',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 10',
    markdown: '<m:abc>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 11',
    markdown: '<foo.bar.baz>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 12',
    markdown: 'https://example.com',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 13',
    markdown: 'foo@bar.example.com',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 14',
    markdown: '<http://foo.bar.baz/test?q=hello&id=22&boolean>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 15',
    markdown: '<http://../>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 16',
    markdown: '<http://foo.bar/baz bim>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 17',
    markdown: '< http://foo.bar >',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks input 18',
    markdown: 'http://example.com',
    engines: BOTH_ENGINES,
  },

  // --- Autolinks (extension) ---
  {
    name: 'Autolinks (extension) input 1',
    markdown: 'www.commonmark.org',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks (extension) input 2',
    markdown: 'Visit www.commonmark.org/help for more information.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks (extension) input 3',
    markdown: 'Visit www.commonmark.org.\n\nVisit www.commonmark.org/a.b.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks (extension) input 4',
    markdown:
      'www.google.com/search?q=Markup+(business)\n\nwww.google.com/search?q=Markup+(business)))\n\n(www.google.com/search?q=Markup+(business))\n\n(www.google.com/search?q=Markup+(business)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks (extension) input 5',
    markdown: 'www.google.com/search?q=(business))+ok',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks (extension) input 6',
    markdown:
      'www.google.com/search?q=commonmark&hl=en\n\nwww.google.com/search?q=commonmark&hl;',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks (extension) input 7',
    markdown: 'www.commonmark.org/he<lp',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks (extension) input 8',
    markdown:
      'http://commonmark.org\n\n(Visit https://encrypted.google.com/search?q=Markup+(business))\n\nAnonymous FTP is available at ftp://foo.bar.baz.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks (extension) input 9',
    markdown: 'foo@bar.baz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks (extension) input 10',
    markdown:
      "hello@mail+xyz.example isn't valid, but hello+xyz@mail.example is.",
    engines: BOTH_ENGINES,
  },

  // --- Block quotes ---
  {
    name: 'Block quotes input 1',
    markdown: '> foo\n\n> bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Block quotes input 2',
    markdown: '> foo\n>\n> bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Block quotes input 3',
    markdown: '> bar\n\nbaz',
    engines: BOTH_ENGINES,
  },

  // --- Code spans ---
  {
    name: 'Code spans input 1',
    markdown: '`foo`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans input 2',
    markdown: '`` foo ` bar ``',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans input 3',
    markdown: '` a`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans input 4',
    markdown: '`\u00a0b\u00a0`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans input 5',
    markdown: '<a href="`">`',
    engines: BOTH_ENGINES,
  },

  // --- Emphasis and strong emphasis ---
  {
    name: 'Emphasis and strong emphasis input 1',
    markdown: '_foo bar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 2',
    markdown: '5_6_78',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 3',
    markdown: 'foo-_(bar)_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 4',
    markdown: '_foo_bar_baz_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 5',
    markdown: '_(bar)_.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 6',
    markdown: '**foo bar**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 7',
    markdown: 'foo**bar**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 8',
    markdown: '5__6__78',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 9',
    markdown: '**foo**bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 10',
    markdown: '**foo [bar](/url)**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 11',
    markdown: 'foo **\\***',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 12',
    markdown: 'foo _\\__',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 13',
    markdown: '**foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 14',
    markdown: '**<a href="**">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis input 15',
    markdown: '_a `_`_',
    engines: BOTH_ENGINES,
  },

  // --- Entity and numeric character references ---
  {
    name: 'Entity and numeric character references input 1',
    markdown: '&copy',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references input 2',
    markdown: '&MadeUpEntity;',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references input 3',
    markdown: '``` f&ouml;&ouml;\nfoo\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references input 4',
    markdown: '`f&ouml;&ouml;`',
    engines: BOTH_ENGINES,
  },

  // --- Fenced code blocks ---
  {
    name: 'Fenced code blocks input 1',
    markdown: '```\n<\n >\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Fenced code blocks input 2',
    markdown: '```\naaa\n~~~\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Fenced code blocks input 3',
    markdown: '```\n\n  \n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Fenced code blocks input 4',
    markdown: '```\n```',
    engines: BOTH_ENGINES,
  },

  // --- HTML blocks ---
  {
    name: 'HTML blocks input 1',
    markdown: '<!DOCTYPE html>',
    engines: BOTH_ENGINES,
  },

  // --- Hard line breaks ---
  {
    name: 'Hard line breaks input 1',
    markdown: 'foo\\\nbaz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Hard line breaks input 2',
    markdown: '<a href="foo\\\nbar">',
    engines: BOTH_ENGINES,
  },

  // --- Images ---
  {
    name: 'Images input 1',
    markdown: '![foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images input 2',
    markdown: '![foo](train.jpg)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images input 3',
    markdown: '![](/url)',
    engines: BOTH_ENGINES,
  },

  // --- Interop ---
  {
    name: 'Interop input 1',
    markdown: '~~www.google.com~~\n\n~~http://google.com~~',
    engines: BOTH_ENGINES,
  },

  // --- Links ---
  {
    name: 'Links input 1',
    markdown: '[link](/uri "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links input 2',
    markdown: '[link](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links input 3',
    markdown: '[link]()',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links input 4',
    markdown: '[link](foo(and(bar)))',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links input 5',
    markdown:
      '[link](#fragment)\n\n[link](https://example.com#fragment)\n\n[link](https://example.com?foo=3#frag)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links input 6',
    markdown: '[link](/url \'title "and" title\')',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links input 7',
    markdown: '[link \\[bar](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links input 8',
    markdown: '[![moon](moon.jpg)](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links input 9',
    markdown: '[foo <bar attr="](baz)">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links input 10',
    markdown:
      '[link](#fragment)\n\n[link](http://example.com#fragment)\n\n[link](http://example.com?foo=3#frag)',
    engines: BOTH_ENGINES,
  },

  // --- List items ---
  {
    name: 'List items input 1',
    markdown: '- one\n\n  two',
    engines: BOTH_ENGINES,
  },

  // --- Lists ---
  {
    name: 'Lists input 1',
    markdown: '- a',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Lists input 2',
    markdown: '1. ```\n   foo\n   ```\n\n   bar',
    engines: BOTH_ENGINES,
  },

  // --- Paragraphs ---
  {
    name: 'Paragraphs input 1',
    markdown: 'aaa\n\nbbb',
    engines: BOTH_ENGINES,
  },

  // --- Raw HTML ---
  {
    name: 'Raw HTML input 1',
    markdown: '<a><bab><c2c>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Raw HTML input 2',
    markdown: '<a/><b2/>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Raw HTML input 3',
    markdown: 'Foo <responsive-image src="foo.jpg" />',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Raw HTML input 4',
    markdown: "<a href=\"hi'> <a href=hi'>",
    engines: BOTH_ENGINES,
  },
  {
    name: 'Raw HTML input 5',
    markdown: "<a href='bar'title=title>",
    engines: BOTH_ENGINES,
  },
  {
    name: 'Raw HTML input 6',
    markdown: '</a></foo >',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Raw HTML input 7',
    markdown: '</a href="foo">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Raw HTML input 8',
    markdown: 'foo <!--> foo -->\n\nfoo <!---> foo -->',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Raw HTML input 9',
    markdown: 'foo <?php echo $a; ?>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Raw HTML input 10',
    markdown: 'foo <!ELEMENT br EMPTY>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Raw HTML input 11',
    markdown: 'foo <a href="\\*">',
    engines: BOTH_ENGINES,
  },

  // --- Setext headings ---
  {
    name: 'Setext headings input 1',
    markdown: '---\n---',
    engines: BOTH_ENGINES,
  },

  // --- Strikethrough (extension) ---
  {
    name: 'Strikethrough (extension) input 1',
    markdown: '~~Hi~~ Hello, world!',
    engines: BOTH_ENGINES,
  },

  // --- Textual content ---
  {
    name: 'Textual content input 1',
    markdown: "hello $.;'there",
    engines: BOTH_ENGINES,
  },
  {
    name: 'Textual content input 2',
    markdown: 'Foo \u03c7\u03c1\u1fc6\u03bd',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Textual content input 3',
    markdown: 'Multiple     spaces',
    engines: BOTH_ENGINES,
  },

  // --- Thematic breaks ---
  {
    name: 'Thematic breaks input 2',
    markdown: '===',
    engines: BOTH_ENGINES,
  },

  // --- baz ---
  {
    name: 'baz input 1',
    markdown: '```ruby\ndef foo(x)\n  return 3\nend\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'baz input 2',
    markdown: '~~~ aa ``` ~~~\nfoo\n~~~',
    engines: BOTH_ENGINES,
  },

  // --- foo ---
  {
    name: 'foo input 1',
    markdown: '####### foo',
    engines: BOTH_ENGINES,
  },
  {
    name: 'foo input 2',
    markdown: '#5 bolt\n\n#hashtag',
    engines: BOTH_ENGINES,
  },
  {
    name: 'foo input 3',
    markdown: '\\## foo',
    engines: BOTH_ENGINES,
  },

  // --- foo ###      ---
  {
    name: 'foo ###      input 1',
    markdown: '### foo ### b',
    engines: BOTH_ENGINES,
  },

  // --- foo ### b ---
  {
    name: 'foo ### b input 1',
    markdown: '# foo#',
    engines: BOTH_ENGINES,
  },

  // --- not a heading ---
  {
    name: 'not a heading input 1',
    markdown: 'foo\\\nbar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'not a heading input 2',
    markdown: '`` \\[\\` ``',
    engines: BOTH_ENGINES,
  },
  {
    name: 'not a heading input 3',
    markdown: '``` foo\\+bar\nfoo\n```',
    engines: BOTH_ENGINES,
  },

  // ===== Identically-normalizing spec inputs (canonical pinned) =====

  // --- Autolinks ---
  {
    name: 'Autolinks canonical 1',
    markdown: '<a+b+c:d>',
    canonical: '[a+b+c:d](a+b+c:d)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks canonical 2',
    markdown: '<made-up-scheme://foo,bar>',
    canonical: '[made-up-scheme://foo,bar](made-up-scheme://foo,bar)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks canonical 3',
    markdown: '<https://example.com/\\[\\>',
    canonical:
      '[https://example.com/\\\\\\[\\\\](https://example.com/%5C%5B%5C)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks canonical 4',
    markdown: '<foo@bar.example.com>',
    canonical: '[foo@bar.example.com](mailto:foo@bar.example.com)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks canonical 5',
    markdown: '<foo+special@Bar.baz-bar0.com>',
    canonical:
      '[foo+special@Bar.baz-bar0.com](mailto:foo+special@Bar.baz-bar0.com)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks canonical 6',
    markdown: '<http://example.com/\\[\\>',
    canonical: '[http://example.com/\\\\\\[\\\\](http://example.com/%5C%5B%5C)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks canonical 7',
    markdown:
      ": http://google.com https://google.com\n\n<http://google.com/\u00e5> http://google.com/\u00e5\n\nscyther@pokemon.com\n\nscy.the_rbe-edr+ill@pokemon.com\n\nscyther@pokemon.com.\n\nscyther@pokemon.com/\n\nscyther@pokemon.com/beedrill@pokemon.com\n\nmailto:scyther@pokemon.com\n\nThis is a mailto:scyther@pokemon.com\n\nmailto:scyther@pokemon.com.\n\nmmmmailto:scyther@pokemon.com\n\nmailto:scyther@pokemon.com/\n\nmailto:scyther@pokemon.com/message\n\nmailto:scyther@pokemon.com/mailto:beedrill@pokemon.com\n\nxmpp:scyther@pokemon.com\n\nxmpp:scyther@pokemon.com.\n\nxmpp:scyther@pokemon.com/message\n\nxmpp:scyther@pokemon.com/message.\n\nEmail me at:scyther@pokemon.com\n\nwww.github.com www.github.com/\u00e1\n\nwww.google.com/a_b\n\nUnderscores not allowed in host name www.xxx.yyy._zzz\n\nUnderscores not allowed in host name www.xxx._yyy.zzz\n\nUnderscores allowed in domain name www._xxx.yyy.zzz\n\n**Autolink and http://inlines**\n\n![http://inline.com/image](http://inline.com/image)\n\na.w@b.c\n\nFull stop outside parens shouldn't be included http://google.com/ok.\n\n(Full stop inside parens shouldn't be included http://google.com/ok.)\n\n\"http://google.com\"\n\n'http://google.com'\n\nhttp://\ud83c\udf44.ga/ http://x\ud83c\udf44.ga/",
    canonical:
      ": http://google.com https://google.com\n\n[http://google.com/\u00e5](http://google.com/%C3%A5) http://google.com/\u00e5\n\nscyther@pokemon.com\n\nscy.the_rbe-edr+ill@pokemon.com\n\nscyther@pokemon.com.\n\nscyther@pokemon.com/\n\nscyther@pokemon.com/beedrill@pokemon.com\n\nmailto:scyther@pokemon.com\n\nThis is a mailto:scyther@pokemon.com\n\nmailto:scyther@pokemon.com.\n\nmmmmailto:scyther@pokemon.com\n\nmailto:scyther@pokemon.com/\n\nmailto:scyther@pokemon.com/message\n\nmailto:scyther@pokemon.com/mailto:beedrill@pokemon.com\n\nxmpp:scyther@pokemon.com\n\nxmpp:scyther@pokemon.com.\n\nxmpp:scyther@pokemon.com/message\n\nxmpp:scyther@pokemon.com/message.\n\nEmail me at:scyther@pokemon.com\n\nwww.github.com www.github.com/\u00e1\n\nwww.google.com/a_b\n\nUnderscores not allowed in host name www.xxx.yyy.\\_zzz\n\nUnderscores not allowed in host name www.xxx.\\_yyy.zzz\n\nUnderscores allowed in domain name www.\\_xxx.yyy.zzz\n\n**Autolink and http://inlines**\n\n![http://inline.com/image](http://inline.com/image)\n\na.w@b.c\n\nFull stop outside parens shouldn't be included http://google.com/ok.\n\n(Full stop inside parens shouldn't be included http://google.com/ok.)\n\n\"http://google.com\"\n\n'http://google.com'\n\nhttp://\ud83c\udf44.ga/ http://x\ud83c\udf44.ga/",
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks canonical 8',
    markdown: "This shouldn't crash everything: (_A_@_.A",
    canonical: "This shouldn't crash everything: (_A_@\\_.A",
    engines: BOTH_ENGINES,
  },
  {
    name: 'Autolinks canonical 9',
    markdown: 'These should not link:\n\n* @a.b.c@. x\n* n@.  b',
    canonical: 'These should not link:\n\n- @a.b.c@. x\n\n- n@.  b',
    engines: BOTH_ENGINES,
  },

  // --- Autolinks (extension) ---
  {
    name: 'Autolinks (extension) canonical 1',
    markdown: 'a.b-c_d@a.b\n\na.b-c_d@a.b.\n\na.b-c_d@a.b-\n\na.b-c_d@a.b_',
    canonical: 'a.b-c_d@a.b\n\na.b-c_d@a.b.\n\na.b-c_d@a.b-\n\na.b-c_d@a.b\\_',
    engines: BOTH_ENGINES,
  },

  // --- Backslash escapes ---
  {
    name: 'Backslash escapes canonical 1',
    markdown:
      '\\!\\"\\#\\$\\%\\&\\\'\\(\\)\\*\\+\\,\\-\\.\\/\\:\\;\\<\\=\\>\\?\\@\\[\\\\\\]\\^\\_\\`\\{\\|\\}\\~',
    canonical: '!"#$%&\'()\\*+,-./:;<=>?@\\[\\\\\\]^\\_\\`{|}\\~',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Backslash escapes canonical 2',
    markdown: '\\\t\\A\\a\\ \\3\\\u03c6\\\u00ab',
    canonical: '\\\\\t\\\\A\\\\a\\\\ \\\\3\\\\\u03c6\\\\\u00ab',
    engines: BOTH_ENGINES,
  },

  // --- Code spans ---
  {
    name: 'Code spans canonical 1',
    markdown: '` `` `',
    canonical: '``` `` ```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 2',
    markdown: '`  ``  `',
    canonical: '```  ``  ```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 3',
    markdown: '`\u00a0`\n`  `',
    canonical: '`\u00a0` `  `',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 4',
    markdown: '``\nfoo\nbar  \nbaz\n``',
    canonical: '`foo bar   baz`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 5',
    markdown: '``\nfoo \n``',
    canonical: '`foo `',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 6',
    markdown: '`foo   bar \nbaz`',
    canonical: '`foo   bar  baz`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 7',
    markdown: '`foo\\`bar`',
    canonical: '`foo\\`bar\\`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 8',
    markdown: '``foo`bar``',
    canonical: '`` foo`bar ``',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 9',
    markdown: '` foo `` bar `',
    canonical: '``` foo `` bar ```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 10',
    markdown: '*foo`*`',
    canonical: '\\*foo`*`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 11',
    markdown: '[not a `link](/foo`)',
    canonical: '\\[not a `link](/foo`)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 12',
    markdown: '`<a href="`">`',
    canonical: '`<a href="`">\\`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 13',
    markdown: '`<https://foo.bar.`baz>`',
    canonical: '`<https://foo.bar.`baz>\\`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 14',
    markdown: '<https://foo.bar.`baz>`',
    canonical: '[https://foo.bar.\\`baz](https://foo.bar.%60baz)\\`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 15',
    markdown: '```foo``',
    canonical: '\\`\\`\\`foo\\`\\`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 16',
    markdown: '`foo',
    canonical: '\\`foo',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 17',
    markdown: '`foo``bar``',
    canonical: '\\`foo`bar`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 18',
    markdown: '`<http://foo.bar.`baz>`',
    canonical: '`<http://foo.bar.`baz>\\`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Code spans canonical 19',
    markdown: '<http://foo.bar.`baz>`',
    canonical: '[http://foo.bar.\\`baz](http://foo.bar.%60baz)\\`',
    engines: BOTH_ENGINES,
  },

  // --- Emphasis and strong emphasis ---
  {
    name: 'Emphasis and strong emphasis canonical 1',
    markdown: '*foo bar*',
    canonical: '_foo bar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 2',
    markdown: 'a * foo bar*',
    canonical: 'a \\* foo bar\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 3',
    markdown: 'a*"foo"*',
    canonical: 'a\\*"foo"\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 4',
    markdown: '*\u00a0a\u00a0*',
    canonical: '\\*\u00a0a\u00a0\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 5',
    markdown:
      '*$*alpha.\n\n*\u00a3*bravo.\n\n*\u20ac*charlie.\n\n*\ud838\udeff*delta.',
    canonical:
      '\\*$\\*alpha.\n\n\\*\u00a3\\*bravo.\n\n\\*\u20ac\\*charlie.\n\n\\*\ud838\udeff\\*delta.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 6',
    markdown: '5*6*78',
    canonical: '5_6_78',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 7',
    markdown: '_ foo bar_',
    canonical: '\\_ foo bar\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 8',
    markdown: 'a_"foo"_',
    canonical: 'a\\_"foo"\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 9',
    markdown: 'foo_bar_',
    canonical: 'foo_bar\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 10',
    markdown:
      '\u043f\u0440\u0438\u0441\u0442\u0430\u043d\u044f\u043c_\u0441\u0442\u0440\u0435\u043c\u044f\u0442\u0441\u044f_',
    canonical:
      '\u043f\u0440\u0438\u0441\u0442\u0430\u043d\u044f\u043c\\_\u0441\u0442\u0440\u0435\u043c\u044f\u0442\u0441\u044f\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 11',
    markdown: 'aa_"bb"_cc',
    canonical: 'aa\\_"bb"\\_cc',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 12',
    markdown: '_foo*',
    canonical: '\\_foo\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 13',
    markdown: '*foo bar *',
    canonical: '\\*foo bar \\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 14',
    markdown: '*foo bar\n*',
    canonical: '\\*foo bar \\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 15',
    markdown: '*(*foo)',
    canonical: '\\*(\\*foo)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 16',
    markdown: '*(*foo*)*',
    canonical: '_(foo_)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 17',
    markdown: '_foo bar _',
    canonical: '\\_foo bar \\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 18',
    markdown: '_(_foo)',
    canonical: '\\_(\\_foo)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 19',
    markdown: '_(_foo_)_',
    canonical: '_(foo_)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 20',
    markdown: '_foo_bar',
    canonical: '\\_foo_bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 21',
    markdown:
      '_\u043f\u0440\u0438\u0441\u0442\u0430\u043d\u044f\u043c_\u0441\u0442\u0440\u0435\u043c\u044f\u0442\u0441\u044f',
    canonical:
      '\\_\u043f\u0440\u0438\u0441\u0442\u0430\u043d\u044f\u043c\\_\u0441\u0442\u0440\u0435\u043c\u044f\u0442\u0441\u044f',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 22',
    markdown: '** foo bar**',
    canonical: '\\*\\* foo bar\\*\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 23',
    markdown: 'a**"foo"**',
    canonical: 'a\\*\\*"foo"\\*\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 24',
    markdown: '__foo bar__',
    canonical: '**foo bar**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 25',
    markdown: '__ foo bar__',
    canonical: '\\_\\_ foo bar_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 26',
    markdown: '__\nfoo bar__',
    canonical: '\\_\\_ foo bar_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 27',
    markdown: 'a__"foo"__',
    canonical: 'a_\\_"foo"\\_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 28',
    markdown: 'foo__bar__',
    canonical: 'foo__bar_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 29',
    markdown:
      '\u043f\u0440\u0438\u0441\u0442\u0430\u043d\u044f\u043c__\u0441\u0442\u0440\u0435\u043c\u044f\u0442\u0441\u044f__',
    canonical:
      '\u043f\u0440\u0438\u0441\u0442\u0430\u043d\u044f\u043c\\_\\_\u0441\u0442\u0440\u0435\u043c\u044f\u0442\u0441\u044f\\_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 30',
    markdown: '__foo, __bar__, baz__',
    canonical: '**foo, bar**, baz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 31',
    markdown: 'foo-__(bar)__',
    canonical: 'foo-**(bar)**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 32',
    markdown: '**foo bar **',
    canonical: '\\*\\*foo bar \\*\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 33',
    markdown: '**(**foo)',
    canonical: '\\*\\*(\\*\\*foo)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 34',
    markdown: '*(**foo**)*',
    canonical: '_(**foo**)_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 35',
    markdown:
      '**Gomphocarpus (*Gomphocarpus physocarpus*, syn.\n*Asclepias physocarpa*)**',
    canonical:
      '**Gomphocarpus (_Gomphocarpus physocarpus_, syn. _Asclepias physocarpa_)**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 36',
    markdown: '**foo "*bar*" foo**',
    canonical: '**foo "_bar_" foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 37',
    markdown: '__foo bar __',
    canonical: '\\__foo bar \\_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 38',
    markdown: '__(__foo)',
    canonical: '\\_\\_(\\__foo)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 39',
    markdown: '_(__foo__)_',
    canonical: '_(**foo**)_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 40',
    markdown: '__foo__bar',
    canonical: '\\__foo__bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 41',
    markdown:
      '__\u043f\u0440\u0438\u0441\u0442\u0430\u043d\u044f\u043c__\u0441\u0442\u0440\u0435\u043c\u044f\u0442\u0441\u044f',
    canonical:
      '\\_\\_\u043f\u0440\u0438\u0441\u0442\u0430\u043d\u044f\u043c\\_\\_\u0441\u0442\u0440\u0435\u043c\u044f\u0442\u0441\u044f',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 42',
    markdown: '__foo__bar__baz__',
    canonical: '**foo__bar__baz**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 43',
    markdown: '__(bar)__.',
    canonical: '**(bar)**.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 44',
    markdown: '*foo [bar](/url)*',
    canonical: '_foo [bar](/url)_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 45',
    markdown: '*foo\nbar*',
    canonical: '_foo bar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 46',
    markdown: '_foo __bar__ baz_',
    canonical: '_foo **bar** baz_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 47',
    markdown: '_foo _bar_ baz_',
    canonical: '_foo bar_ baz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 48',
    markdown: '__foo_ bar_',
    canonical: '_foo_ bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 49',
    markdown: '*foo *bar**',
    canonical: '_foo bar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 50',
    markdown: '*foo **bar** baz*',
    canonical: '_foo **bar** baz_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 51',
    markdown: '*foo**bar**baz*',
    canonical: '_foo**bar**baz_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 52',
    markdown: '*foo**bar*',
    canonical: '_foo\\*\\*bar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 53',
    markdown: '*foo **bar***',
    canonical: '_foo **bar**_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 54',
    markdown: '*foo**bar***',
    canonical: '_foo**bar**_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 55',
    markdown: 'foo******bar*********baz',
    canonical: 'foo**bar**\\*\\*\\*baz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 56',
    markdown: '*foo [*bar*](/url)*',
    canonical: '_foo [bar](/url)_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 57',
    markdown: '** is not an empty emphasis',
    canonical: '\\*\\* is not an empty emphasis',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 58',
    markdown: '**** is not an empty strong emphasis',
    canonical: '\\*\\*\\*\\* is not an empty strong emphasis',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 59',
    markdown: '**foo\nbar**',
    canonical: '**foo bar**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 60',
    markdown: '__foo _bar_ baz__',
    canonical: '**foo _bar_ baz**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 61',
    markdown: '__foo __bar__ baz__',
    canonical: '**foo bar** baz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 62',
    markdown: '____foo__ bar__',
    canonical: '**foo** bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 63',
    markdown: '**foo **bar****',
    canonical: '**foo bar**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 64',
    markdown: '**foo *bar* baz**',
    canonical: '**foo _bar_ baz**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 65',
    markdown: '**foo*bar*baz**',
    canonical: '**foo_bar_baz**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 66',
    markdown: '***foo* bar**',
    canonical: '**_foo_ bar**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 67',
    markdown: '**foo *bar***',
    canonical: '**foo _bar_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 68',
    markdown: '**foo [*bar*](/url)**',
    canonical: '**foo _[bar](/url)_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 69',
    markdown: '__ is not an empty emphasis',
    canonical: '\\_\\_ is not an empty emphasis',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 70',
    markdown: '____ is not an empty strong emphasis',
    canonical: '\\___\\_ is not an empty strong emphasis',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 71',
    markdown: 'foo ***',
    canonical: 'foo \\*\\*\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 72',
    markdown: 'foo *\\**',
    canonical: 'foo _\\*_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 73',
    markdown: 'foo *_*',
    canonical: 'foo _\\__',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 74',
    markdown: 'foo *****',
    canonical: 'foo \\*\\*\\*\\*\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 75',
    markdown: 'foo **_**',
    canonical: 'foo **\\_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 76',
    markdown: '**foo*',
    canonical: '\\*_foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 77',
    markdown: '*foo**',
    canonical: '_foo_\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 78',
    markdown: '***foo**',
    canonical: '\\***foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 79',
    markdown: '****foo*',
    canonical: '\\*\\*\\*_foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 80',
    markdown: '**foo***',
    canonical: '**foo**\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 81',
    markdown: '*foo****',
    canonical: '_foo_\\*\\*\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 82',
    markdown: 'foo ___',
    canonical: 'foo \\__\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 83',
    markdown: 'foo _*_',
    canonical: 'foo _\\*_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 84',
    markdown: 'foo _____',
    canonical: 'foo \\____\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 85',
    markdown: 'foo __\\___',
    canonical: 'foo **\\_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 86',
    markdown: 'foo __*__',
    canonical: 'foo **\\***',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 87',
    markdown: '__foo_',
    canonical: '\\__foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 88',
    markdown: '_foo__',
    canonical: '_foo_\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 89',
    markdown: '___foo__',
    canonical: '\\_**foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 90',
    markdown: '____foo_',
    canonical: '\\__\\__foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 91',
    markdown: '__foo___',
    canonical: '**foo**\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 92',
    markdown: '_foo____',
    canonical: '_foo_\\__\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 93',
    markdown: '*_foo_*',
    canonical: '_foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 94',
    markdown: '__foo__',
    canonical: '**foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 95',
    markdown: '_*foo*_',
    canonical: '_foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 96',
    markdown: '****foo****',
    canonical: '**foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 97',
    markdown: '____foo____',
    canonical: '**foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 98',
    markdown: '******foo******',
    canonical: '**foo**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 99',
    markdown: '***foo***',
    canonical: '**_foo_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 100',
    markdown: '_____foo_____',
    canonical: '**_foo_**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 101',
    markdown: '*foo _bar* baz_',
    canonical: '_foo \\_bar_ baz\\_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 102',
    markdown: '*foo __bar *baz bim__ bam*',
    canonical: '_foo **bar \\*baz bim** bam_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 103',
    markdown: '**foo **bar baz**',
    canonical: '\\*\\*foo **bar baz**',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 104',
    markdown: '*foo *bar baz*',
    canonical: '\\*foo _bar baz_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 105',
    markdown: '*[bar*](/url)',
    canonical: '\\*[bar\\*](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 106',
    markdown: '_foo [bar_](/url)',
    canonical: '\\_foo [bar\\_](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 107',
    markdown: '*<img src="foo" title="*"/>',
    canonical: '_<img src="foo" title="_"/>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 108',
    markdown: '__<a href="__">',
    canonical: '**<a href="**">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 109',
    markdown: '*a `*`*',
    canonical: '_a `*`_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 110',
    markdown: '**a<https://foo.bar/?q=**>',
    canonical: '\\*\\*a<https://foo.bar/?q=**>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 111',
    markdown: '__a<https://foo.bar/?q=__>',
    canonical: '\\__a<https://foo.bar/?q=__>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 112',
    markdown: '**a<http://foo.bar/?q=**>',
    canonical: '\\*\\*a<http://foo.bar/?q=**>',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Emphasis and strong emphasis canonical 113',
    markdown: '__a<http://foo.bar/?q=__>',
    canonical: '\\__a<http://foo.bar/?q=__>',
    engines: BOTH_ENGINES,
  },

  // --- Entity and numeric character references ---
  {
    name: 'Entity and numeric character references canonical 1',
    markdown:
      '&nbsp; &amp; &copy; &AElig; &Dcaron;\n&frac34; &HilbertSpace; &DifferentialD;\n&ClockwiseContourIntegral; &ngE;',
    canonical:
      '\u00a0 & \u00a9 \u00c6 \u010e \u00be \u210b \u2146 \u2232 \u2267\u0338',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references canonical 2',
    markdown: '&#35; &#1234; &#992; &#0;',
    canonical: '\\# \u04d2 \u03e0 \ufffd',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references canonical 3',
    markdown: '&#X22; &#XD06; &#xcab;',
    canonical: '" \u0d06 \u0cab',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references canonical 4',
    markdown:
      '&nbsp &x; &#; &#x;\n&#87654321;\n&#abcdef0;\n&ThisIsNotDefined; &hi?;',
    canonical:
      '&nbsp &x; &#; &#x; &#87654321; &#abcdef0; &ThisIsNotDefined; &hi?;',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references canonical 5',
    markdown: '<a href="&ouml;&ouml;.html">',
    canonical: '<a href="\u00f6\u00f6.html">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references canonical 6',
    markdown: '[foo](/f&ouml;&ouml; "f&ouml;&ouml;")',
    canonical: '[foo](/f%C3%B6%C3%B6 "f\u00f6\u00f6")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references canonical 7',
    markdown: '[foo]\n\n[foo]: /f&ouml;&ouml; "f&ouml;&ouml;"',
    canonical: '[foo](/f%C3%B6%C3%B6 "f\u00f6\u00f6")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references canonical 8',
    markdown: '    f&ouml;f&ouml;',
    canonical: '```\nf&ouml;f&ouml;\n```',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references canonical 9',
    markdown: '&#42;foo&#42;\n*foo*',
    canonical: '\\*foo\\* _foo_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references canonical 10',
    markdown: '&#42; foo\n\n* foo',
    canonical: '\\* foo\n\n- foo',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references canonical 11',
    markdown: 'foo&#10;&#10;bar',
    canonical: 'foo\n\nbar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references canonical 12',
    markdown: '[a](url &quot;tit&quot;)',
    canonical: '\\[a\\](url "tit")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Entity and numeric character references canonical 13',
    markdown:
      '&nbsp &x; &#; &#x;\n&#987654321;\n&#abcdef0;\n&ThisIsNotDefined; &hi?;',
    canonical:
      '&nbsp &x; &#; &#x; &#987654321; &#abcdef0; &ThisIsNotDefined; &hi?;',
    engines: BOTH_ENGINES,
  },

  // --- Hard line breaks ---
  {
    name: 'Hard line breaks canonical 1',
    markdown: 'foo  \nbaz',
    canonical: 'foo\\\nbaz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Hard line breaks canonical 2',
    markdown: 'foo       \nbaz',
    canonical: 'foo\\\nbaz',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Hard line breaks canonical 3',
    markdown: 'foo  \n     bar',
    canonical: 'foo\\\nbar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Hard line breaks canonical 4',
    markdown: 'foo\\\n     bar',
    canonical: 'foo\\\nbar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Hard line breaks canonical 5',
    markdown: '*foo  \nbar*',
    canonical: '_foo\\\nbar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Hard line breaks canonical 6',
    markdown: '*foo\\\nbar*',
    canonical: '_foo\\\nbar_',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Hard line breaks canonical 7',
    markdown: '`code  \nspan`',
    canonical: '`code   span`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Hard line breaks canonical 8',
    markdown: '`code\\\nspan`',
    canonical: '`code\\ span`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Hard line breaks canonical 9',
    markdown: '<a href="foo  \nbar">',
    canonical: '<a href="foo\\\nbar">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Hard line breaks canonical 10',
    markdown: 'foo\\',
    canonical: 'foo\\\\',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Hard line breaks canonical 11',
    markdown: 'foo  ',
    canonical: 'foo',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Hard line breaks canonical 12',
    markdown: '### foo\\',
    canonical: '### foo\\\\',
    engines: BOTH_ENGINES,
  },

  // --- Images ---
  {
    name: 'Images canonical 1',
    markdown: '![foo *bar*]\n\n[foo *bar*]: train.jpg "train & tracks"',
    canonical: '![foo bar](train.jpg "train & tracks")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 2',
    markdown: '![foo ![bar](/url)](/url2)',
    canonical: '![foo bar](/url2)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 3',
    markdown: '![foo [bar](/url)](/url2)',
    canonical: '![foo bar](/url2)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 4',
    markdown: '![foo *bar*][]\n\n[foo *bar*]: train.jpg "train & tracks"',
    canonical: '![foo bar](train.jpg "train & tracks")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 5',
    markdown: '![foo *bar*][foobar]\n\n[FOOBAR]: train.jpg "train & tracks"',
    canonical: '![foo bar](train.jpg "train & tracks")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 6',
    markdown: 'My ![foo bar](/path/to/train.jpg  "title"   )',
    canonical: 'My ![foo bar](/path/to/train.jpg "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 7',
    markdown: '![foo](<url>)',
    canonical: '![foo](url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 8',
    markdown: '![foo][bar]\n\n[bar]: /url',
    canonical: '![foo](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 9',
    markdown: '![foo][bar]\n\n[BAR]: /url',
    canonical: '![foo](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 10',
    markdown: '![foo][]\n\n[foo]: /url "title"',
    canonical: '![foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 11',
    markdown: '![*foo* bar][]\n\n[*foo* bar]: /url "title"',
    canonical: '![foo bar](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 12',
    markdown: '![Foo][]\n\n[foo]: /url "title"',
    canonical: '![Foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 13',
    markdown: '![foo] \n[]\n\n[foo]: /url "title"',
    canonical: '![foo](/url "title") \\[\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 14',
    markdown: '![foo]\n\n[foo]: /url "title"',
    canonical: '![foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 15',
    markdown: '![*foo* bar]\n\n[*foo* bar]: /url "title"',
    canonical: '![foo bar](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 16',
    markdown: '![[foo]]\n\n[[foo]]: /url "title"',
    canonical: '\\![[foo]]\n\n[[foo]]: /url "title"',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 17',
    markdown: '![Foo]\n\n[foo]: /url "title"',
    canonical: '![Foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 18',
    markdown: '!\\[foo]\n\n[foo]: /url "title"',
    canonical: '!\\[foo\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Images canonical 19',
    markdown: '\\![foo]\n\n[foo]: /url "title"',
    canonical: '\\![foo](/url "title")',
    engines: BOTH_ENGINES,
  },

  // --- Inlines ---
  {
    name: 'Inlines canonical 1',
    markdown: '`hi`lo`',
    canonical: '`hi`lo\\`',
    engines: BOTH_ENGINES,
  },

  // --- Links ---
  {
    name: 'Links canonical 1',
    markdown: '[](./target.md)',
    canonical: '',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 2',
    markdown: '[link](<>)',
    canonical: '[link]()',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 3',
    markdown: '[]()',
    canonical: '',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 4',
    markdown: '[link](/my uri)',
    canonical: '\\[link\\](/my uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 5',
    markdown: '[link](</my uri>)',
    canonical: '[link](/my%20uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 6',
    markdown: '[link](foo\nbar)',
    canonical: '\\[link\\](foo bar)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 7',
    markdown: '[link](<foo\nbar>)',
    canonical: '\\[link\\](<foo bar>)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 8',
    markdown: '[a](<b)c>)',
    canonical: '[a](b)c)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 9',
    markdown: '[link](<foo\\>)',
    canonical: '\\[link\\](<foo>)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 10',
    markdown: '[a](<b)c\n[a](<b)c>\n[a](<b>c)',
    canonical: '\\[a\\](<b)c \\[a\\](<b)c> \\[a\\](<b>c)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 11',
    markdown: '[link](\\(foo\\))',
    canonical: '[link]((foo))',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 12',
    markdown: '[link](foo(and(bar))',
    canonical: '\\[link\\](foo(and(bar))',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 13',
    markdown: '[link](foo\\)\\:)',
    canonical: '[link](foo):)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 14',
    markdown: '[link](foo\\bar)',
    canonical: '[link](foo%5Cbar)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 15',
    markdown: '[link](foo%20b&auml;)',
    canonical: '[link](foo%20b%C3%A4)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 16',
    markdown: '[link]("title")',
    canonical: '[link](%22title%22)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 17',
    markdown:
      '[link](/url "title")\n[link](/url \'title\')\n[link](/url (title))',
    canonical: '[link](/url "title") [link](/url "title") [link](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 18',
    markdown: '[link](/url "title \\"&quot;")',
    canonical: '[link](/url \'title ""\')',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 19',
    markdown: '[link](/url\u00a0"title")',
    canonical: '[link](/url%C2%A0%22title%22)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 20',
    markdown: '[link](/url "title "and" title")',
    canonical: '\\[link\\](/url "title "and" title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 21',
    markdown: '[link](   /uri\n  "title"  )',
    canonical: '[link](/uri "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 22',
    markdown: '[link] (/uri)',
    canonical: '\\[link\\] (/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 23',
    markdown: '[link [foo [bar]]](/uri)',
    canonical: '[link \\[foo \\[bar\\]\\]](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 24',
    markdown: '[link] bar](/uri)',
    canonical: '\\[link\\] bar\\](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 25',
    markdown: '[link [bar](/uri)',
    canonical: '\\[link [bar](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 26',
    markdown: '[foo [bar](/uri)](/uri)',
    canonical: '\\[foo [bar](/uri)\\](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 27',
    markdown: '[foo *[bar [baz](/uri)](/uri)*](/uri)',
    canonical: '\\[foo _\\[bar [baz](/uri)\\](/uri)_\\](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 28',
    markdown: '![[[foo](uri1)](uri2)](uri3)',
    canonical: '![\\[foo\\](uri2)](uri3)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 29',
    markdown: '*[foo*](/uri)',
    canonical: '\\*[foo\\*](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 30',
    markdown: '[foo *bar](baz*)',
    canonical: '[foo \\*bar](baz\\*)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 31',
    markdown: '*foo [bar* baz]',
    canonical: '_foo \\[bar_ baz\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 32',
    markdown: '[foo`](/uri)`',
    canonical: '\\[foo`](/uri)`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 33',
    markdown: '[foo<https://example.com/?search=](uri)>',
    canonical:
      '\\[foo[https://example.com/?search=\\](uri)](https://example.com/?search=%5D(uri))',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 34',
    markdown: '[foo][bar]\n\n[bar]: /url "title"',
    canonical: '[foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 35',
    markdown: '[link [foo [bar]]][ref]\n\n[ref]: /uri',
    canonical: '[link \\[foo \\[bar\\]\\]](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 36',
    markdown: '[link \\[bar][ref]\n\n[ref]: /uri',
    canonical: '[link \\[bar](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 37',
    markdown: '[![moon](moon.jpg)][ref]\n\n[ref]: /uri',
    canonical: '[![moon](moon.jpg)](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 38',
    markdown: '[foo [bar](/uri)][ref]\n\n[ref]: /uri',
    canonical: '\\[foo [bar](/uri)\\][ref](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 39',
    markdown: '[foo *bar [baz][ref]*][ref]\n\n[ref]: /uri',
    canonical: '\\[foo _bar [baz](/uri)_\\][ref](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 40',
    markdown: '*[foo*][ref]\n\n[ref]: /uri',
    canonical: '\\*[foo\\*](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 41',
    markdown: '[foo *bar][ref]*\n\n[ref]: /uri',
    canonical: '[foo \\*bar](/uri)\\*',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 42',
    markdown: '[foo <bar attr="][ref]">\n\n[ref]: /uri',
    canonical: '[foo <bar attr="](/uri)">',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 43',
    markdown: '[foo`][ref]`\n\n[ref]: /uri',
    canonical: '\\[foo`][ref]`',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 44',
    markdown: '[foo<https://example.com/?search=][ref]>\n\n[ref]: /uri',
    canonical:
      '\\[foo[https://example.com/?search=\\]\\[ref\\]](https://example.com/?search=%5D%5Bref%5D)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 45',
    markdown: '[foo][BaR]\n\n[bar]: /url "title"',
    canonical: '[foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 46',
    markdown: '[\u1e9e]\n\n[SS]: /url',
    canonical: '[\u1e9e](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 47',
    markdown: '[Foo\n  bar]: /url\n\n[Baz][Foo bar]',
    canonical: '[Baz](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 48',
    markdown: '[foo] [bar]\n\n[bar]: /url "title"',
    canonical: '\\[foo\\] [bar](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 49',
    markdown: '[foo]\n[bar]\n\n[bar]: /url "title"',
    canonical: '\\[foo\\] [bar](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 50',
    markdown: '[foo]: /url1\n\n[foo]: /url2\n\n[bar][foo]',
    canonical: '[bar](/url1)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 51',
    markdown: '[bar][foo\\!]\n\n[foo!]: /url',
    canonical: '\\[bar\\]\\[foo!\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 52',
    markdown: '[foo][ref[]\n\n[ref[]: /uri',
    canonical: '\\[foo\\]\\[ref\\[\\]\n\n\\[ref\\[\\]: /uri',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 53',
    markdown: '[foo][ref[bar]]\n\n[ref[bar]]: /uri',
    canonical: '\\[foo\\]\\[ref\\[bar\\]\\]\n\n\\[ref\\[bar\\]\\]: /uri',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 54',
    markdown: '[[[foo]]]\n\n[[[foo]]]: /url',
    canonical: '\\[\\[\\[foo\\]\\]\\]\n\n\\[\\[\\[foo\\]\\]\\]: /url',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 55',
    markdown: '[foo][ref\\[]\n\n[ref\\[]: /uri',
    canonical: '[foo](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 56',
    markdown: '[bar\\\\]: /uri\n\n[bar\\\\]',
    canonical: '[bar\\\\](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 57',
    markdown: '[]\n\n[]: /uri',
    canonical: '\\[\\]\n\n\\[\\]: /uri',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 58',
    markdown: '[\n ]\n\n[\n ]: /uri',
    canonical: '\\[ \\]\n\n\\[ \\]: /uri',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 59',
    markdown: '[foo][]\n\n[foo]: /url "title"',
    canonical: '[foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 60',
    markdown: '[*foo* bar][]\n\n[*foo* bar]: /url "title"',
    canonical: '_[foo](/url "title")_[ bar](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 61',
    markdown: '[Foo][]\n\n[foo]: /url "title"',
    canonical: '[Foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 62',
    markdown: '[foo] \n[]\n\n[foo]: /url "title"',
    canonical: '[foo](/url "title") \\[\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 63',
    markdown: '[foo]\n\n[foo]: /url "title"',
    canonical: '[foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 64',
    markdown: '[*foo* bar]\n\n[*foo* bar]: /url "title"',
    canonical: '_[foo](/url "title")_[ bar](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 65',
    markdown: '[[*foo* bar]]\n\n[*foo* bar]: /url "title"',
    canonical: '[[*foo* bar]]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 66',
    markdown: '[[bar [foo]\n\n[foo]: /url',
    canonical: '\\[\\[bar [foo](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 67',
    markdown: '[Foo]\n\n[foo]: /url "title"',
    canonical: '[Foo](/url "title")',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 68',
    markdown: '[foo] bar\n\n[foo]: /url',
    canonical: '[foo](/url) bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 69',
    markdown: '\\[foo]\n\n[foo]: /url "title"',
    canonical: '\\[foo\\]',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 70',
    markdown: '[foo*]: /url\n\n*[foo*]',
    canonical: '\\*[foo\\*](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 71',
    markdown: '[foo][bar]\n\n[foo]: /url1\n[bar]: /url2',
    canonical: '[foo](/url2)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 72',
    markdown: '[foo][]\n\n[foo]: /url1',
    canonical: '[foo](/url1)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 73',
    markdown: '[foo]()\n\n[foo]: /url1',
    canonical: '[foo]()',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 74',
    markdown: '[foo](not a link)\n\n[foo]: /url1',
    canonical: '[foo](/url1)(not a link)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 75',
    markdown: '[foo][bar][baz]\n\n[baz]: /url',
    canonical: '\\[foo\\][bar](/url)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 76',
    markdown: '[foo][bar][baz]\n\n[baz]: /url1\n[bar]: /url2',
    canonical: '[foo](/url2)[baz](/url1)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 77',
    markdown: '[foo][bar][baz]\n\n[baz]: /url1\n[foo]: /url2',
    canonical: '\\[foo\\][bar](/url1)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 78',
    markdown: '[foo<http://example.com/?search=](uri)>',
    canonical:
      '\\[foo[http://example.com/?search=\\](uri)](http://example.com/?search=%5D(uri))',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 79',
    markdown: '[foo *bar][ref]\n\n[ref]: /uri',
    canonical: '[foo \\*bar](/uri)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 80',
    markdown: '[foo<http://example.com/?search=][ref]>\n\n[ref]: /uri',
    canonical:
      '\\[foo[http://example.com/?search=\\]\\[ref\\]](http://example.com/?search=%5D%5Bref%5D)',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Links canonical 81',
    markdown:
      '[\u0422\u043e\u043b\u043f\u043e\u0439][\u0422\u043e\u043b\u043f\u043e\u0439] is a Russian word.\n\n[\u0422\u041e\u041b\u041f\u041e\u0419]: /url',
    canonical:
      '[\u0422\u043e\u043b\u043f\u043e\u0439](/url) is a Russian word.',
    engines: BOTH_ENGINES,
  },

  // --- Precedence ---
  {
    name: 'Precedence canonical 1',
    markdown: '- `one\n- two`',
    canonical: '- \\`one\n\n- two\\`',
    engines: BOTH_ENGINES,
  },

  // --- Strikethrough (extension) ---
  {
    name: 'Strikethrough (extension) canonical 1',
    markdown: 'This ~~has a\n\nnew paragraph~~.',
    canonical: 'This \\~\\~has a\n\nnew paragraph\\~\\~.',
    engines: BOTH_ENGINES,
  },

  // --- Strikethroughs ---
  {
    name: 'Strikethroughs canonical 1',
    markdown: 'A proper ~strikethrough~.',
    canonical: 'A proper \\~strikethrough\\~.',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Strikethroughs canonical 2',
    markdown:
      "These are ~not strikethroughs.\n\nNo, they are not~\n\nThis ~is ~ legit~ isn't ~ legit.\n\nThis is not ~~~~~one~~~~~ huge strikethrough.\n\n~one~ ~~two~~ ~~~three~~~\n\nNo ~mismatch~~",
    canonical:
      "These are \\~not strikethroughs.\n\nNo, they are not\\~\n\nThis \\~is \\~ legit\\~ isn't \\~ legit.\n\nThis is not \\~~~one~~\\~ huge strikethrough.\n\n\\~one\\~ ~~two~~ \\~~~three~~\\~\n\nNo \\~mismatch\\~\\~",
    engines: BOTH_ENGINES,
  },

  // --- Task list items (extension) ---
  {
    name: 'Task list items (extension) canonical 1',
    markdown: '- [ ] foo\n- [x] bar',
    canonical: '- [ ] foo\n\n- [x] bar',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Task list items (extension) canonical 2',
    markdown: '- [x] foo\n  - [ ] bar\n  - [x] baz\n- [ ] bim',
    canonical: '- [x] foo\n\n  - [ ] bar\n\n  - [x] baz\n\n- [ ] bim',
    engines: BOTH_ENGINES,
  },

  // --- Task lists ---
  {
    name: 'Task lists canonical 1',
    markdown:
      '- [x] foo\n  - [ ] bar\n  - [x] baz\n- [ ] bim\n\nShow a regular (non task) list to show that it has the same structure\n- [@] foo\n  - [@] bar\n  - [@] baz\n- [@] bim',
    canonical:
      '- [x] foo\n\n  - [ ] bar\n\n  - [x] baz\n\n- [ ] bim\n\nShow a regular (non task) list to show that it has the same structure\n\n- \\[@\\] foo\n\n  - \\[@\\] bar\n\n  - \\[@\\] baz\n\n- \\[@\\] bim',
    engines: BOTH_ENGINES,
  },
  {
    name: 'Task lists canonical 2',
    markdown:
      '- [x] foo\n    - [ ] bar\n    - [x] baz\n- [ ] bim\n\nShow a regular (non task) list to show that it has the same structure\n- [@] foo\n    - [@] bar\n    - [@] baz\n- [@] bim',
    canonical:
      '- [x] foo\n\n  - [ ] bar\n\n  - [x] baz\n\n- [ ] bim\n\nShow a regular (non task) list to show that it has the same structure\n\n- \\[@\\] foo\n\n  - \\[@\\] bar\n\n  - \\[@\\] baz\n\n- \\[@\\] bim',
    engines: BOTH_ENGINES,
  },
];
