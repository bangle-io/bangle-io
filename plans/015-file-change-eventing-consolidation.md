---
title: File Change Eventing Consolidation
status: planned
type: plan
archived: false
archived_on:
created: 2026-07-18
updated: 2026-08-01
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/652
  - https://github.com/bangle-io/bangle-io/pull/626
related_issues:
  - https://github.com/bangle-io/bangle-io/issues/521
---

# File Change Eventing Consolidation

## Summary

Tech-debt record for how file-change signals propagate through the app. The
machinery is layered and typed, but it has grown into several overlapping
mechanisms with implicit contracts, and every new consumer re-implements the
same event-deduplication bookkeeping by hand. This plan documents the problem
so the consolidation can be scheduled deliberately — most likely alongside the
Native FS `FileSystemObserver` work (issue #521), which will push external
disk changes through every one of these paths for the first time.

This plan is problem-focused on purpose. It sketches directions only loosely;
the actual design should be decided when the work is picked up.

## Current status

Documented during the notes-table work (PR #652), which added two more
consumers (note file stats scan + targeted patch) and hit one of the implicit
contracts described below as a real bug during review (force-update did not
refresh stats). The Native FS external-change observation this plan was
waiting on has now landed (PR #626): the provider seam is live, external disk
changes flow through the existing typed events with a sender tag, and
`ExternalContentSync` joined as another emitter-direct consumer. The
"consolidate immediately before it lands" window has therefore passed; the
consumer-side consolidation itself has still not started. The write-provenance
primitive that would remove the sender-tag discrimination is recorded as plan
019 M1.

Inventory verified against `main` 2026-07-24; the ten atoms, the force-update
side-channel, and the dead `onChange` seam are unchanged. `NoteSnapshotService`
has since joined as a consumer — see mechanism 5 and Cost 4. The stale-tab
dialog is local-only and adds no file-event consumer.

## The problem

### Inventory: five stacked mechanisms

1. **Provider `onChange` seam (`service-platform`).** Each file-storage
   adapter (IndexedDB, Native FS, memory) has an internal
   `emitChange(FileStorageChangeEvent)` feeding a constructor `onChange`
   callback. This seam is currently dead-ended: `initialize-services` wires it
   to `logger.info` only, and only for the IndexedDB and Native FS adapters —
   memory's is not wired at all. No signal flows through it; it exists as
   reserved plumbing for `FileSystemObserver`.

2. **`RootEmitter` (`shared/root-emitter`).** Hand-rolled typed pub/sub with
   scoped views per service and a BroadcastChannel transport for the
   `CROSS_TAB_EVENTS` allowlist (`event::file:update`,
   `event::file:force-update`, `event::app:reload-ui`, and — added since this
   inventory was written — `event::app:build-presence`).

3. **Command-side emission in `FileSystemService`.** Change detection is not
   observation of storage: the service emits `event::file:update`
   (create / content-update / delete / rename) after each of its *own*
   successful mutations. Nothing watches the disk.

4. **Atom fan-out in `FileSystemService`.** The service subscribes to its own
   scoped emitter (local echo plus cross-tab) and translates events into ten
   atoms: five counters (`$fileCreateCount`, `$fileContentUpdateCount`,
   `$fileDeleteCount`, `$fileRenameCount`, `$fileForceUpdateCount`), three
   payload event atoms carrying monotonic sequence numbers
   (`$fileCreateEvent`, `$fileContentUpdateEvent`, `$fileRenameEvent`), and
   two derived sums (`$fileTreeChangeCount`, `$fileListRevisionCount`).

5. **Per-consumer bookkeeping (`service-core`, `core/editor`).**
   `WorkspaceStateService` runs the relist effect off `$fileTreeChangeCount`,
   merges racing creations via `createdWsPathsBySequence`, relocates renames,
   rebuilds the backlink index off `$fileContentUpdateCount`, and runs the
   note-stats scan/patch off `$fileForceUpdateCount` and
   `$fileContentUpdateEvent`. `PmEditorService` follows renames via
   `$fileRenameEvent` (no longer with a handled-sequence field — it relies on
   an idempotent handler). `EditorService` consumes no file events at all — it
   subscribes only `event::editor:reload-editor` — but it *emits*
   `file:force-update` as an "invalidate everything" hammer on Native FS auth
   recovery. `NoteSnapshotService` also subscribes the
   scoped emitter directly, discriminates its own writes from cross-tab echoes
   via `event.sender`, and keeps its own path-state relocation for
   create/delete/rename.

### Cost 1: atoms used as event channels

Jotai atoms are last-value-wins state containers; file changes are a stream.
Forcing the stream through atoms required sequence numbers on the producer
side — and every consumer independently re-implements "have I already handled
this event" with its own handled-sequence field. That pattern currently exists
in **three** places, all inside `WorkspaceStateService`: the stats patch, the
create merge, and the rename relocation. (Corrected 2026-07-24 from "at least
four": `PmEditorService` no longer keeps a handled-sequence field — it
subscribes `$fileRenameEvent` and re-reads it, relying on an idempotent
handler.) Each future consumer must write another copy, and each copy is an
opportunity for a subtle bug (missed gating, wrong reset on remount,
double-handling).

A second-order effect: because an atom only holds the latest event, a consumer
that processes events asynchronously can drop a superseded predecessor (two
near-simultaneous saves to different notes leave one stale until the next full
refresh). Streams do not have this failure mode; last-value atoms do.

### Cost 2: two vocabularies with implicit contracts

Counters are coarse and lose the path; event atoms are precise but demand the
bookkeeping above. Consumers must choose correctly per use case, and must also
know the unwritten rules — most notably that `event::file:force-update` bumps
all counters but none of the event atoms. This exact gap produced a real bug
during PR #652 review: the stats logic listened to the content-update event
and missed force-update relists entirely. The knowledge of which operations
invalidate which caches lives in counter arithmetic
(`$fileTreeChangeCount = delete + rename + force`), which nothing
self-describes or enforces.

### Cost 3: a dead seam that will come alive

The provider `onChange` seam carries no events today, so every consumer path
has only ever been exercised by command-side echoes of the app's own writes.
When `FileSystemObserver` (issue #521) starts feeding external disk changes
into this pipe, the volume, ordering, and re-entrancy characteristics change:
events will arrive that no local command produced, potentially in bursts, and
the optimistic-merge bookkeeping in `WorkspaceStateService` will meet inputs
it has never seen. Consolidating after that lands means debugging two problems
at once; consolidating immediately before it lands has a natural forcing
function and test vehicle.

### Cost 4: the atom layer is lossy, and silently pushes consumers off it

The atom fan-out discards `event.sender`, so "was this my own write or another
tab's" is unanswerable from atoms. `NoteSnapshotService` needs exactly that
discrimination and therefore subscribes the scoped emitter directly — it is the
only consumer of `event::file:update` outside the translating service itself,
and it bypassed atoms for a structural reason rather than preference. It also
hand-rolls its own create/delete/rename path-state relocation, mirroring
`WorkspaceStateService`'s against a different vocabulary: duplicated *semantics*
rather than duplicated dedup. It is additionally on the write path via two
`async` hooks that `FileSystemService` awaits before `writeFile`, so one
service now participates through two mechanisms — and a snapshot failure or
delay sits in front of the user's own write.

This binds harder once FileSystemObserver adds a third origin — an external
disk change that is neither self nor a known peer tab.

### What is *not* the problem

The layering itself is sound: providers → emitter → one translating service →
consumers, with an explicit cross-tab allowlist, typed events end-to-end, and
consistent abort/cleanup discipline. This is organized but repetitive
complexity — the issue is duplication of consumer-side mechanics and implicit
producer contracts, not spaghetti.

## Scope (what a fix must achieve)

- A consumer should be able to react to "file X changed in way Y" without
  writing its own sequence/dedup bookkeeping.
- The invalidation contract (which operations affect listings, content
  caches, stats, editors) should be explicit in one place rather than encoded
  in counter arithmetic and tribal knowledge.
- Force-update must not be a side-channel that event-consumers can miss.
- The design must accommodate observation-side events (FileSystemObserver,
  cross-tab) with the same guarantees as command-side echoes.
- Sender identity must survive to consumers (Cost 4).

## Out of scope

- The durable workspace index cache (plan 007) — related consumer, separate
  initiative.
- Changing what events exist or how storage adapters detect changes.
- Any UI-visible behavior change.

## Possible directions (non-binding)

- A single typed change-log atom (`{ sequence, kind, wsPath, oldWsPath? }`)
  with counters derived from it, plus one shared subscription helper that owns
  dedup — deleting the per-consumer copies.
- Alternatively, reserve atoms strictly for state and have event consumers
  subscribe the scoped emitter directly (the pattern `NoteSnapshotService`
  already uses), so events are never round-tripped through last-value atoms.

## Verification (when picked up)

- Existing suites must pass unchanged: the file-system, workspace-state,
  note-file-stats, and editor specs plus the full Playwright suite already
  cover the observable behavior of every consumer listed above.
- Add coverage for the failure modes this debt causes today: superseded-event
  drops and force-update visibility to event-consumers.

## Next steps

- The FileSystemObserver integration (issue #521, PR #626) has landed, so the
  preferred scheduling window is gone; pick this up on its own merits, ideally
  with plan 019 M1 so sender discrimination and dedup land as one design.
- Re-read the consumer inventory above at pickup time; PR #652 and later work
  may have added consumers.
