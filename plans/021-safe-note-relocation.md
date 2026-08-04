---
title: Safe Note Rename And Move
status: active
type: plan
archived: false
archived_on:
created: 2026-08-03
updated: 2026-08-03
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/700
related_issues:
  - https://github.com/bangle-io/bangle-io/issues/679
---

# Safe Note Rename And Move

## Summary

Make Bangle-initiated rename and move preserve direct relative references from
the relocated note without turning one file operation into a workspace-wide
transaction. The first release handles one Markdown note in one workspace,
keeps assets where they are, and edits only destination spans that can be
identified exactly.

Incoming references in other notes are intentionally not rewritten in this
release. That follow-up requires separate product decisions about multi-note
writes, dirty editors in other tabs, recovery, and external filesystem races.

## Current Status

Implementation and local verification are complete on the linked draft PR.
An independent senior review approved the final design after the relocation
handoff was moved onto the browser-root save coordinator so it survives an
in-app UI-service reload.

The existing relocation foundation already:

- drains the initiating note's save queue before rename or move;
- rejects destination conflicts without overwriting;
- keeps the source during Native FS copy fallback until verification succeeds;
- retargets the route, tree, editor, save queue, stars, snapshots, and clean
  secondary tabs through existing rename events; and
- covers durable content, reload, stars, collisions, and cross-tab behavior.

The remaining v1 problem is narrower: moving a note changes the base path of
its direct relative note, image, and file links. Those links can silently point
elsewhere or stop resolving even though the path move itself succeeds.

## Product Decisions

### One note-oriented Module

Add one `NoteRelocationService.relocate()` Module in
`@bangle.io/service-core`. Existing rename and move callers use it only for
Markdown notes. Raw file moves and directory operations retain their existing
behavior.

```ts
type NoteRelocationRequest = Readonly<{
  source: WsFilePath;
  destination: WsFilePath;
}>;

type NoteRelocationReceipt = Readonly<{
  source: WsFilePath;
  destination: WsFilePath;
  rewrittenReferences: number;
  warnings: readonly NoteRelocationWarning[];
}>;

interface NoteRelocationService {
  relocate(request: NoteRelocationRequest): Promise<NoteRelocationReceipt>;
}
```

This is the only new caller-facing Interface. Reference planning, safe source
edits, save coordination, and rollback details remain inside the Module. Do
not add public preview, transaction, journal, lock, or cancellation interfaces.

### Source-only reference preservation

V1 inspects and may edit only the Markdown note being relocated. It does not
scan or mutate other notes.

Supported forms are deliberately limited to direct syntax on a one-line,
root-level paragraph whose raw line exactly matches the Markdown tokenizer's
inline content. Within those safe lines, v1 handles:

- explicit-path wiki links such as `[[./note]]`, `[[../note]]`, and
  `[[/folder/note]]`, including aliases and fragments;
- direct inline Markdown links to existing Markdown notes; and
- direct inline Markdown images or file links to existing local files.

Rewrite a destination only when it resolves to one existing workspace file
before relocation and a replacement can be generated that resolves to that
same file from the destination note path.

V1 leaves these byte-identical:

- bare wiki links;
- reference-style Markdown definitions;
- extensionless Markdown targets whose interpretation differs between current
  resolvers;
- external URLs, explicit schemes, and fragment-only links;
- code, frontmatter, HTML, comments, escaped text, malformed syntax, and
  unsupported dialect constructs; and
- headings, lists, blockquotes, multi-line paragraphs, and any other container;
- any destination whose exact source range or resolved identity is uncertain.

Recognized-but-unsupported references do not block the physical relocation.
Return a concise warning count instead. Syntax outside the safe-line contract
is skipped without claiming it was analyzed. A destination changed after
planning, a newer local edit, or an editor engine unable to perform the guarded
write also keeps the physical move and warns with the exact number of planned
edits skipped.

Only data-safety failures block: source save failure, missing source,
destination collision, read failure, rename failure, or destination content
write failure. On a write failure, report whether returning the durable file to
its original path succeeded.

### Assets stay where they are

Do not move an `assets/` directory or infer asset ownership. Rebase supported
direct links in the note so they continue to resolve to the same existing
files. Shared-asset analysis, orphan cleanup, and "move attachments with note"
remain out of scope.

### Preserve Markdown bytes

Apply descending replacements to exact destination ranges. Do not parse and
serialize the complete note through an editor. Preserve labels, aliases,
fragments, line endings, whitespace, and every byte outside changed ranges.

## Operation And Failure Semantics

1. Validate Markdown file paths, same-workspace scope, no-op, source existence,
   and destination conflict.
2. Drain the initiating tab's source save queue using existing editor-save
   coordination.
3. Read the latest durable source and calculate only supported exact edits.
4. Relocate through the existing durable `FileSystemService.renameFile()` path
   so current route, editor, storage-adapter, and cross-tab behavior remains in
   force.
5. Re-read the destination after rename and apply the plan only when its bytes
   still equal the source snapshot used for planning. If they differ, keep the
   move, leave the newer bytes untouched, and warn with the skipped edit count.
6. For the ProseMirror engine, apply the rewritten Markdown through the
   existing per-note save queue and a private relocation handoff so a route
   remount or in-app UI-service reload cannot load and later re-save the
   pre-rewrite body. Keep the handoff on the existing browser-root save
   coordinator so replacement service graphs share the in-flight outcome. If a
   newer local edit wins, keep it and warn. An editor engine without this safe
   write path keeps the physical move and warns instead of pretending the
   rewrite landed.
7. If the destination content write fails, best-effort rename the destination
   back to the source. Report whether compensation succeeded. Never delete the
   only durable copy and never claim universal filesystem atomicity.
8. Migrate stars after the content and path operation succeeds. Snapshot
   migration remains the current event-driven, best-effort behavior.

Existing file events remain immediate. V1 does not add deferred publication,
conditional storage writes, fingerprints, durable journals, crash-repair UX,
or cross-tab dirty-editor coordination.

## Scope

- Rename one Markdown note within one workspace.
- Move one Markdown note within one workspace.
- Preserve supported direct relative note and local-file destinations from the
  relocated note.
- Keep existing raw-file and directory behavior unchanged.
- Preserve current route, editor, tree, star, snapshot, clean-cross-tab, and
  reload behavior.

## Out Of Scope

- Rewriting incoming references or scanning the full workspace.
- Guaranteed backlink preservation after rename.
- Bare wiki-link duplicate-proximity repair.
- Reference-style Markdown links and generic dialect support.
- Cross-workspace move or copy.
- Directory reference rewriting.
- Moving or renaming assets as part of a note move.
- Stable IDs, redirects, tombstones, or automatic broken-link repair.
- Workspace mutation leases, multi-file transactions, durable recovery
  records, user-facing Undo, and dirty-secondary-tab guarantees.
- Reacting to external filesystem renames by modifying Markdown.

## Delivery

1. Add a pure source-position-aware rewrite planner for the explicitly
   supported direct forms.
2. Prove aliases, fragments, CRLF, encoding, code/frontmatter exclusion, local
   images, and byte preservation with focused fixtures.
3. Add the narrow `NoteRelocationService` Module and test it through its single
   Interface using real memory storage where practical.
4. Route Markdown note rename and move callers through the Module while leaving
   raw files and directories alone.
5. Add a released-workflow Playwright E2E that moves a note containing a direct
   relative note link and local image, then verifies both after reload.
6. Run required repository checks and perform an independent code review before
   updating the draft PR.

## Verification

Focused rewrite tests must cover:

- supported wiki aliases and fragments on safe root-level lines;
- inline Markdown links and images;
- relative and rooted destinations, spaces, Unicode, and safe URL encoding;
- code, frontmatter, HTML, escaped syntax, external URLs, malformed input,
  headings, lists, blockquotes, and multi-line paragraphs;
- LF and CRLF; and
- byte identity outside changed destination spans.

Module and integration tests must cover:

- source missing, destination conflict, and same-path no-op;
- save drain failure and same-tab edits near relocation;
- route remount and UI-service reload while the destination write is pending;
- unchanged content when no supported rewrite is required;
- destination bytes changing after planning, newer local edits, and an editor
  engine without a guarded content-write path;
- content-write failure with successful and unsuccessful compensation;
- raw non-note files retaining their existing move behavior; and
- stars, reload, and existing clean-cross-tab behavior.

The released E2E must use user-visible rename or move controls and verify after
reload that the moved note still opens its direct relative note link and renders
its local image. Existing path, content, collision, star, and cross-tab tests
remain part of the regression suite.

Implementation completion requires `pnpm lint:ci`, `pnpm test:ci`, and the
relevant Playwright suite. Before the final PR update, `pnpm local-ci-check`
must pass.

Final local verification on 2026-08-03:

- `pnpm lint:ci` passed;
- `pnpm test:ci` passed 175 files and 3,731 tests, with one skipped;
- `pnpm build` passed;
- the focused note-relocation Playwright file passed all four workflows; and
- `pnpm local-ci-check` passed, including 220 browser E2E tests, eight
  component tests, desktop tests/build, and the Electron persistence smoke.

## Known Risks

- Exact source positions for Markdown destinations are not available from the
  current backlink tokens. The rewrite planner must prove its own narrow spans
  without becoming a second full Markdown parser.
- Same-tab editor writes can race a post-rename content rewrite. Prefer a small
  extension of existing queue coordination over a new locking framework.
- Native FS and external programs cannot participate in an application-level
  transaction. Compensation is best effort and must be reported honestly.

## Follow-Up

Create a separate plan for automatic inbound-link preservation only after the
product chooses its multi-note consistency contract. That plan must explicitly
address dirty editors in other tabs, conditional writes or conflict handling,
event visibility, partial failure, and crash recovery.
