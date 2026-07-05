# Attribution

The files in this directory are verbatim copies of the Wordgard
documentation, vendored for offline/agent reference. Wordgard is written by
Marijn Haverbeke and licensed under MIT.

Sources (fetched 2026-07-05, wordgard@0.1.1):

- `guide.md`, `migrating-from-prosemirror.md`, `faq.md`, `examples/*.md`:
  https://code.haverbeke.berlin/wordgard/website
  (commit `ec4d5d7dda4c6cc9f9d26625aaa44b1bacda39cf`, MIT per its
  package.json). Rendered at https://wordgard.net/docs/.
- `README.md`, `CHANGELOG.md`:
  https://code.haverbeke.berlin/wordgard/wordgard
  (commit `741841f6fe3def6e343c8b9555d848ec26d89710`, MIT).

Notes:

- The `!{...}` first line in some files and `{@link ...}` markers are the
  upstream site build's metadata/cross-reference syntax; read around them.
- The reference manual (API docs) is generated from source doc comments and
  is not vendored. Once the `wordgard` dependency is installed, the complete
  typed API lives in `node_modules/wordgard/dist/*.d.ts` with full doc
  comments.
- Refresh these copies (and re-record the commits above) whenever the pinned
  `wordgard` version is bumped.
