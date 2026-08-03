---
title: Markdown feature parity (footnotes, autolinks, math, highlight, raw HTML, reference links, callouts)
status: completed
type: plan
archived: true
archived_on: 2026-08-03
created: 2026-07-07
updated: 2026-08-03
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/615
  - https://github.com/bangle-io/bangle-io/pull/637
  - https://github.com/bangle-io/bangle-io/pull/650
  - https://github.com/bangle-io/bangle-io/pull/653
  - https://github.com/bangle-io/bangle-io/pull/658
  - https://github.com/bangle-io/bangle-io/pull/695
related_issues: []
---

> DONE Completed the pragmatic high-ROI parity slice on 2026-08-03 in PR
> #695. Callouts, highlights, math corpus and backlink alignment, and safety-gate
> coverage shipped. Final verification passed with `pnpm lint:ci`,
> `pnpm test:ci`, `pnpm build`, the focused Playwright workflow, and
> `pnpm local-ci-check`. Footnotes, bare-URL source provenance,
> reference-definition preservation, and rich raw HTML remain intentionally
> deferred.

# Markdown feature parity

## Summary

This roadmap started as a broad Markdown parity effort. It is complete as a
pragmatic fidelity and authoring slice rather than a promise to implement every
Markdown dialect feature. The delivered work protects common note formats,
adds high-value syntax with exact serialization, and keeps unsupported or
normalizing syntax visible through the editor's fidelity warning.

## Delivered

- YAML frontmatter, inline and display math, and the broader Markdown fidelity
  baseline landed in PRs #615, #637, #650, #653, and #658.
- PR #695 added basic `> [!type]` callouts by extending the blockquote owner.
  Marker-only and inline-title forms round-trip exactly; nested content and
  ordinary blockquotes retain their existing semantics.
- PR #695 added `==highlight==` as an editable `<mark>` with typing, paste,
  selection-menu, parse, and exact serialization support.
- The shared corpus now records callout, highlight, and math as explicit
  ProseMirror-only fixtures. Wordgard parity therefore remains visible instead
  of silently changing that engine's token stream.
- Backlink extraction now uses the math tokenizer, so wiki-link-looking text
  inside math is not indexed while links in callouts remain discoverable.
- Round-trip safety coverage now includes orphan footnote definitions and
  multiline raw HTML, alongside focused unit, integration, and Playwright
  persistence coverage for the shipped features.

## Audit corrections

The closeout audit corrected assumptions in the original probe:

- Basic callouts were not safe plain blockquotes: the marker could be escaped
  or flattened on save. The supported subset now round-trips exactly.
- Multiline raw HTML can collapse or normalize; it is not generally safe plain
  text. The fidelity warning detects the tested lossy cases.
- Orphan footnote definitions can disappear completely. They are covered by
  the safety gate but are not represented as editable rich nodes.
- Bare URLs and `==highlight==` were already byte-stable as plain text.
  Highlight was selected because it also offers a small, useful authoring
  feature; bare-URL fidelity requires source provenance across both engines.

## Intentional deferrals

- **Footnotes:** complete support spans reference and definition nodes,
  unresolved pairs, block indentation, two engines, and durable editing. The
  implementation risk is disproportionate to current evidence; lossy cases
  remain warned, and the planned source editor is the general recovery path.
- **Bare URLs:** existing source is preserved as text and typing/paste already
  creates links. Preserving whether a parsed link was bare, angle-wrapped, or
  explicit requires source provenance, so this is deferred until demand
  justifies a cross-engine design.
- **Reference links and entities:** current cross-engine normalization is
  intentional and corpus-visible. Preserving unused definitions would require
  a document-level representation; unsafe cases continue to warn.
- **Raw HTML:** one-line inert HTML may remain stable, but multiline forms can
  be lossy. Arbitrary rendering is excluded because of its security and
  fidelity costs; source-mode work is the appropriate escape hatch.
- **Single-tilde strike and definition lists:** these remain lower-value
  dialect extensions and are covered by the fidelity boundary rather than new
  editor schema.
- **Broader callout dialects:** folding markers, aliases, custom icons, and
  other renderer-specific behavior are deliberately declined. The implemented
  grammar accepts conservative ASCII callout types and preserves malformed
  input as ordinary Markdown.

## Cross-engine boundary

Callout, highlight, and math meaning is opt-in to the ProseMirror parser and
recorded as `engines: ['prosemirror']` in the shared golden corpus. No base
tokenizer behavior was changed for Wordgard. Future parity work can implement
those fixtures in Wordgard without reverse-engineering an implicit contract.

## Verification

- `pnpm lint:ci` passed.
- `pnpm test:ci` passed: 174 files, 3,712 tests passed, 1 skipped.
- `pnpm build` passed with the existing Sentry-token and chunk-size warnings.
- Focused Playwright coverage for callout import, highlight authoring,
  persistence, and reload passed.
- `pnpm local-ci-check` passed, including 218 E2E tests, 8 component tests, and
  the desktop persistence smoke. Two unrelated E2E tests passed on retry.

Further Markdown parity work should be evidence-driven under a focused issue or
plan, or coordinated with the source-editor and Wordgard roadmaps, rather than
reopening this catch-all plan.
