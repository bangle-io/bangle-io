# Markdown edge-case fixture sources

The `markdown-edge-cases/` workspace is original test material curated after
reviewing the fixture suites below. No upstream fixture file was copied in
full. The links are retained so future additions can trace why a case exists.

- MarkText E2E fixtures (MIT): front matter, mixed lists, tables, math, and
  hostile raw HTML.
  https://github.com/marktext/marktext/tree/develop/packages/desktop/test/e2e/data
- Joplin import fixtures (AGPL-3.0-or-later): loose lists, task lists, escaped
  formatting, tables with line breaks, images, and HTML conversion boundaries.
  https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/enex_to_md
- Zettlr GUI test workspace (GPL-3.0): footnotes, complex URL resolution,
  escaping, Unicode tags, tables, citations, and raw Markdown extensions.
  https://github.com/Zettlr/Zettlr/tree/develop/scripts/test-gui/test-files
- Logseq graph-parser workspace (AGPL-3.0): realistic multi-directory graphs,
  page names containing spaces, hashes and Unicode, properties, wiki links,
  and journal-style files.
  https://github.com/logseq/logseq/tree/master/deps/graph-parser/test/resources/exporter-test-graph
