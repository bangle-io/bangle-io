---
title: Native FS backend for note snapshots
status: planned
type: plan
archived: false
archived_on:
created: 2026-07-24
updated: 2026-08-01
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/669
  - https://github.com/bangle-io/bangle-io/pull/676
related_issues: []
---

# Native FS Backend For Note Snapshots

## Summary

Recoverable note snapshots shipped in PR #669, with rename-survival and
lost-writer retry hardening in PR #676. `NoteSnapshotService` declares
`static deps = ['database']`, so every snapshot is written to the `database` DI
slot — IndexedDB in the browser — regardless of which storage backend the
workspace itself uses.

For Browser workspaces that is coherent: notes and their recovery history share
one durability domain. For Native FS workspaces it is not. The notes are files
the user owns on disk, but their recovery history lives in browser storage,
where it is invisible to the user, unavailable on another machine or profile,
and destroyed by clearing site data — while the notes it protects survive. The
agreed direction is a file-backed snapshot store for Native FS workspaces,
under a workspace-local directory such as `.bangle/backups/`.

The split is by **workspace type, not by snapshot age**: Browser workspaces keep
the database store, Native FS workspaces write to the workspace directory. This
is deliberately not a tiering or archival scheme.

## Current status

Planned; no implementation. This plan exists because the shipped feature had no
durable record and the follow-up was only captured in conversation.

`NoteSnapshotService` is database-only (`static deps = ['database']`). It sits
on the write path via two `async` pre-write hooks that `FileSystemService`
awaits *before* `writeFile`, and also subscribes the scoped emitter directly —
plan 015 (file change eventing) records the constraints that come with that.
The awaited-before-write ordering is what makes the write-path question below
a real one rather than theoretical.

## Scope

- A snapshot storage seam that can be satisfied by either the database or a
  file-backed implementation, selected by workspace type.
- A Native FS implementation writing under a workspace-local directory.
- Keep the Recovery page and the recover command working unchanged across both
  backends.

## Out of scope

- Changing snapshot capture policy, retention counts, or the recovery UX.
- Syncing snapshots between devices, or any remote/cloud backend.
- Migrating existing database snapshots for Native FS workspaces — decide
  explicitly at pickup whether they are migrated, left readable in place, or
  dropped.

## Open questions

These need answers before implementation, and none should be guessed:

- Directory name and layout, and whether it must be hidden from the file tree,
  search, backlinks, and the notes table. The external-change watcher (PR
  #626) applies the listing's visibility policy before classifying records,
  so a dot-prefixed directory such as `.bangle/backups/` is ignored by
  observation for free once #626 merges — the decision reduces to name and
  layout.
- Whether a write failure to the snapshot directory (permission loss, quota,
  read-only volume) may ever fail or delay the user's own note write. It must
  not — but the pre-write hook currently sits on the write path, so this needs
  a deliberate answer.
- Behavior when the user deletes or edits files inside the snapshot directory
  by hand, which they can and eventually will.

## Verification

- Contract-level tests covering both backends with the same behavior, in the
  style of the existing file-storage contract tests.
- Recovery E2E extended to a Native FS workspace, including recovery after a
  reload.
- Explicit failure-path coverage: snapshot write failure must leave the note
  write successful and surface a non-destructive error.

## Known blockers

Depends on the open questions above, and on PR #626 landing (its watcher-side
hidden-path exclusion is what keeps a dot-prefixed snapshot directory out of
external-change observation).

## Next steps

1. Answer the open questions, especially the write-path safety one.
2. Design the storage seam against both backends before writing either.
