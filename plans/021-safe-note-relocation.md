---
title: Safe Note Rename And Move
status: planned
type: plan
archived: false
archived_on:
created: 2026-08-03
updated: 2026-08-03
owner: mixed
related_prs: []
related_issues:
  - https://github.com/bangle-io/bangle-io/issues/679
---

# Safe Note Rename And Move

## Summary

Treat a Bangle-initiated note rename or move as one semantic operation instead
of a raw file rename. Preserve only references Bangle can already resolve and
rewrite safely. Keep assets in place and rebase their links. Do not infer
ownership, repair unsupported syntax, or introduce hidden note identities.

The first release stays deliberately narrow: one Markdown note, one workspace,
one `relocate()` entry point, exact source edits, and explicit failure when the
operation cannot be proven safe.

## Product Outcome

After a successful rename or move:

- the latest note content remains durable;
- the route, open editor, file tree, stars, and snapshots follow the new path;
- deterministically resolved incoming note links still reach the same note;
- relative links and asset references from the moved note still reach the same
  files;
- backlinks rebuild from the corrected Markdown;
- unrelated Markdown bytes do not change; and
- reload and clean secondary tabs observe the same final state.

Success must not imply that Bangle updated unsupported or unresolved syntax.

## Current Status

The low-level relocation foundation is already strong:

- command handlers wait for source saves before the storage rename;
- storage adapters reject destination conflicts without overwriting;
- Native FS keeps the source until its fallback copy is byte-verified;
- logical rename events retarget the route, file tree, editor, save queue,
  snapshots, stars, and other tabs after storage succeeds; and
- current E2E coverage proves content, path, star, cross-tab, and reload
  behavior.

The missing behavior is semantic reference preservation. Current rename and
move operations do not rewrite incoming wiki/Markdown links or rebase outgoing
relative note and asset links. The backlink index is derived from Markdown, so
it correctly reflects whatever is stored but cannot repair broken sources.

## KISS Product Decisions

### One note-only Module

Add a `NoteRelocationService` in `@bangle.io/service-core`. Rename and move
commands become thin callers. Keep raw non-note file moves and directory
renames on their existing paths until they receive separate product scope.

```ts
type NoteRelocationRequest = Readonly<{
  source: WsFilePath;
  destination: WsFilePath;
}>;

type NoteRelocationReceipt = Readonly<{
  source: WsFilePath;
  destination: WsFilePath;
  rewrittenNotes: number;
  rewrittenReferences: number;
  warnings: readonly NoteRelocationWarning[];
}>;

interface NoteRelocationService {
  relocate(
    request: NoteRelocationRequest,
    options?: { signal?: AbortSignal },
  ): Promise<NoteRelocationReceipt>;
}
```

Do not expose separate public methods for planning, reference rewriting,
editor retargeting, metadata migration, or recovery. Those are implementation
details behind this interface.

### Automatic only when deterministic

For Bangle-initiated relocation, update a reference only when all of the
following are true:

1. Bangle recognizes the syntax using shared Markdown/link semantics.
2. The reference resolves to one exact workspace file before relocation.
3. Its source destination span is known exactly.
4. A replacement can be generated that resolves to the same mapped file after
   relocation.
5. The source file still matches the version used to plan the edit.

If a recognized reference would break but Bangle cannot produce an exact safe
edit, block the relocation with the source note and reason. Never guess or
silently report full preservation.

### Assets stay where they are

Moving a note does not move its `assets/` directory or any adjacent files.
Asset ownership is ambiguous and assets may be shared. Recalculate supported
relative Markdown asset targets in the moved note so they continue to resolve
to the existing asset paths.

Do not add orphan cleanup, shared-asset analysis, per-note asset ownership, or
"move attachments with note" behavior in this plan.

### Preserve source, not formatting output

Apply descending source-range replacements to the stored Markdown. Never
parse and serialize the whole note through either editor engine. Labels,
aliases, fragments, encoding style, line endings, whitespace, and all bytes
outside changed destination spans remain untouched.

## Reference Preservation Rules

Build a pre-relocation and projected post-relocation note index. For every
supported reference, preserve resolved identity rather than literal spelling.

The first release covers:

- Bangle wiki links, including aliases, when their target resolves exactly;
- internal CommonMark note links whose destination span is exact;
- reference definitions when their shared destination span is exact;
- Markdown images and local file links in the moved note; and
- rooted and relative paths, extensions, fragments, and safe URL encoding.

Rewrite:

- incoming references to the moved note;
- outgoing relative note and asset references from the moved note; and
- any otherwise-resolved wiki link whose target would change because the move
  changed duplicate-name proximity or ambiguity.

Leave byte-identical:

- external URLs and explicit schemes;
- unresolved or already-ambiguous references;
- code, frontmatter, raw HTML, comments, escaped text, and malformed syntax;
- unsupported embeds or dialect-specific constructs; and
- visible link labels, except where an unaliased wiki target is itself the
  visible text.

The reference analyzer becomes the shared source of truth for backlink
extraction and relocation planning so those behaviors cannot drift.

## Operation And Failure Semantics

1. Validate file paths, Markdown type, same-workspace scope, no-op, source
   existence, and destination conflict before mutation.
2. Quiesce app writes for the workspace, drain affected editor save queues,
   and acquire one workspace mutation lease shared with file writes.
3. Read the current Markdown, build the pre/post indexes, and calculate exact
   edits.
4. Re-read/fingerprint affected files under the lease. Abort and re-plan if
   any source changed.
5. Persist one narrowly scoped recovery record containing the old/new path,
   affected file fingerprints, and original affected Markdown before the
   first write.
6. Apply reference content edits and the durable file rename. Do not emit
   logical file events until the complete operation succeeds.
7. On failure, restore only files whose fingerprints prove they still contain
   this operation's output. Never overwrite a later user or external edit.
8. If safe compensation cannot finish, retain the recovery record and surface
   `recovery-required`; never emit success.
9. After durable success, emit the rename before content updates so editor
   paths retarget first, then migrate stars and snapshot metadata. Metadata
   failure is a warning and repair task, not a claim that the file move failed.

Memory and IndexedDB may implement this more atomically than Native FS. The
product must not claim universal filesystem atomicity. The recovery record is
the safety mechanism, not a new general transaction framework.

## User Experience

- Rename and move dialogs stay open with controls disabled while relocation is
  pending.
- Collision, save timeout, stale content, read failure, or unsafe recognized
  reference keeps the dialog input and leaves the workspace unchanged.
- Safe deterministic reference edits happen as part of the requested action;
  there is no settings matrix in the first release.
- Success copy reports useful impact, for example: "Moved plan.md and updated
  7 references in 3 notes."
- No-op relocation produces no success toast or storage event.
- Cancellation is supported before the durable mutation begins. Once the
  durability phase starts, the operation must settle to success, compensated
  failure, or recovery-required rather than report a false cancellation.

## Scope

- Rename one Markdown note within its workspace.
- Move one Markdown note within its workspace.
- Preserve deterministic supported incoming and outgoing references.
- Rebase supported local asset references without moving asset files.
- Preserve current editor, route, tree, star, snapshot, cross-tab, and reload
  behavior.
- Browser, memory, IndexedDB, and Native FS behavioral alignment.

## Out Of Scope

- Cross-workspace moves or copies.
- Directory rename/move reference rewriting.
- Moving or renaming assets and repairing their inbound references.
- Automatically moving attachments with notes.
- Stable IDs, hidden frontmatter IDs, redirect notes, aliases, or tombstones.
- Repairing existing broken links.
- Rewriting raw HTML, frontmatter, code, or unsupported Markdown dialects.
- Reacting to external filesystem renames by modifying other files.
- General preview, configurable `never/prompt/always` behavior, or user-facing
  Undo in the first release.

## Delivery Phases

### Phase 1: Pure reference analysis

- Add a source-range-aware internal reference analyzer using the shared
  Markdown tokenizer and `WsPath` resolvers.
- Return resolved targets and exact editable destination spans.
- Refactor backlink extraction to consume the same analyzer.
- Add fidelity tests before wiring any mutation.

### Phase 2: Narrow relocation Module

- Add `NoteRelocationService.relocate()` and typed expected failures.
- Add the workspace mutation lease, conditional fingerprint checks, deferred
  event publication, and the minimal recovery record.
- Test success, compensation, interrupted recovery, and unsafe rollback with
  real memory storage and adapter contract coverage.

### Phase 3: Existing callers and UX

- Route current note rename, move dialog, tree drag/drop for Markdown notes,
  and note-table actions through the Module.
- Keep raw asset moves and directory operations unchanged.
- Make dialogs await completion and retain their input on failure.
- Add translations and completion impact counts.

### Phase 4: Released workflow proof

- Extend `note-relocation.e2e.ts` with wiki, Markdown, duplicate-name, image,
  backlink, cross-tab, reload, collision, and failure cases.
- Add Native FS recovery/fallback coverage for affected behavior.
- Run the required project gates and the release-candidate manual persistence
  smoke before release.

## Verification

Pure analyzer coverage must include:

- wiki targets with aliases and duplicate stems;
- inline and reference-style Markdown links;
- relative/rooted paths, extensions, fragments, spaces, and Unicode;
- incoming links and outgoing links from a moved source;
- images and other local asset links;
- code, frontmatter, HTML, escaped syntax, external URLs, and malformed input;
- CRLF/LF and byte preservation outside replaced spans; and
- projected links that would change to a different duplicate target.

Module and adapter coverage must include:

- source missing, destination conflict, and same-path no-op;
- pending, failed, and late editor saves;
- affected files changing between analysis and commit;
- read, permission, quota, content-write, rename, and compensation failures;
- interrupted-operation recovery without overwriting subsequent edits;
- final rename/content event ordering;
- stars and snapshots after success or metadata degradation; and
- clean and dirty secondary-tab behavior.

Implementation completion requires `pnpm lint:ci` and `pnpm test:ci`. Add or
update Playwright coverage during implementation but run it for the final PR
update according to repository policy. Before the final PR update, run
`pnpm local-ci-check`.

## Known Blockers And Risks

- Markdown-it tokens do not currently expose every editable destination range;
  the analyzer must prove source ranges without regex replacement or whole-note
  serialization.
- Rewriting dependent notes expands save coordination beyond the moved source,
  especially when another tab has a dirty editor. The mutation lease must
  prevent stale app writes from undoing reference edits.
- Native FS cannot provide a universal multi-file transaction against external
  OS writers. Fingerprints and conditional recovery are mandatory.
- A full workspace scan is acceptable for the first release because relocation
  is infrequent. Reuse the workspace index later only if measurements justify
  the added cache invalidation complexity.

## Alignment Questions

1. Should safe deterministic inbound-link updates happen automatically, as
   proposed, or should Bangle only rebase the moved note and show an impact
   report for other notes?
2. When a recognized reference would break but cannot be rewritten exactly,
   should relocation block, as proposed, or allow an explicit "move anyway"
   escape hatch?
3. Please confirm that assets should stay at their current paths while the
   moved note's supported links are rebased; moving asset files with the note
   remains out of scope.

## Next Steps

- Resolve the three alignment questions above.
- Validate an exact source-range approach for wiki and CommonMark destinations
  with a small pure spike.
- Split implementation into the analyzer, relocation Module, and UX/E2E phases
  above rather than combining semantic rewriting and storage mutation in one
  large change.
