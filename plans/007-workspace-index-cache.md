---
title: Workspace Index Cache
status: planned
type: plan
archived: false
created: 2026-06-30
updated: 2026-06-30
owner: mixed
related_prs: []
related_issues: []
---

# Workspace Index Cache

## Summary

Build a workspace-level derived-data cache that can power linked mentions,
search, note metadata, and future workspace-wide features without each React
component scanning files independently.

The immediate motivation was `LinkedMentions`, which originally read every
Markdown file in the active workspace and extracted links from React. A
lightweight service-owned backlink index now exists in `WorkspaceStateService`,
so React no longer performs the scan. That index is intentionally narrow: it is
an in-memory full rebuild for linked mentions, not the durable workspace index
cache described here.

The target design is a lower-level `WorkspaceIndexService` that owns async
index building, incremental updates, stale-while-revalidate behavior, cache
clearing, and eventual persisted snapshots.

## Current Status

- `WorkspaceStateService.$backlinkIndex` currently builds an in-memory reverse
  link map for the active workspace, reading Markdown notes with concurrency
  `4`, preserving prior data during rebuilds, aborting stale rebuilds, and
  surfacing an error state.
- `packages/core/app/src/components/backlinks/linked-mentions.tsx` now renders
  backlinks from `WorkspaceStateService.$backlinkIndex` instead of reading or
  parsing Markdown in React.
- `FileSystemService` already emits typed file update events with `wsPath`
  payloads for create, content update, delete, and rename.
- `WorkspaceStateService` already maintains the active workspace file list via
  `$wsPaths` and the temporary backlink index.
- The current public signals used by UI consumers are mostly counters such as
  `$fileContentUpdateCount`, which are easy to observe but discard which file
  changed.
- The wiki/link target helpers in `@bangle.io/ws-path` already provide the
  canonical path resolution rules needed by a link index.

## Scope

- Replace the temporary `WorkspaceStateService.$backlinkIndex` with a dedicated
  service-level workspace index/cache lifecycle.
- Preserve the existing behavior that keeps linked-mentions backlink
  computation out of React.
- Maintain an in-memory link graph:
  - source note to outgoing linked notes;
  - target note to incoming backlinks.
- Support async full rebuilds and incremental updates from file events.
- Preserve existing linked-mentions behavior and Markdown safety rules.
- Expose typed atoms/APIs suitable for UI consumers.
- Add focused tests for build, update, delete, rename, stale rebuild, and
  cancellation behavior.
- Prepare the service shape for future search and metadata indexes.

## Out Of Scope

- Implementing a full-text search index in the first phase.
- Persisting index snapshots in the first phase unless the in-memory service
  lands cleanly and has tests first.
- Automatically rewriting note contents when backlinks or paths change.
- Cross-workspace link indexing.
- Moving Markdown parsing into a worker in the first phase.
- Replacing the existing file-storage APIs.

## Design

### Package Ownership

Put `WorkspaceIndexService` in `packages/core/service-core`.

That layer already owns business services, can depend on `@bangle.io/ws-path`,
and can consume `FileSystemService` and `WorkspaceStateService` without leaking
core behavior into platform or UI packages.

Keep platform persistence separate. A later `WorkspaceIndexCacheProvider` can
live behind platform implementations when persisted snapshots are added.

React components should not read files or parse Markdown for workspace-wide
indexes. They should subscribe to typed service atoms and render the current
service state.

### Service Responsibilities

The service should own:

- one index lifecycle per workspace;
- full rebuild scheduling and cancellation;
- incremental updates for known file changes;
- stale-while-revalidate behavior;
- bounded read concurrency;
- generation IDs so stale async completions cannot overwrite newer data;
- error state and retry hooks;
- memory cleanup when services unmount or a workspace is evicted.

Initial public API shape:

```ts
type WorkspaceIndexStatus =
  | { status: 'idle' }
  | { status: 'building'; indexed: number; total: number }
  | { status: 'ready'; generation: number }
  | { status: 'stale'; generation: number }
  | { status: 'error'; error: Error; generation?: number };

type WorkspaceLinkGraph = {
  outgoingBySource: ReadonlyMap<string, ReadonlySet<string>>;
  incomingByTarget: ReadonlyMap<string, ReadonlySet<string>>;
};
```

Candidate service methods and atoms:

```ts
$workspaceIndexStatus(wsName: string): Atom<WorkspaceIndexStatus>
$backlinksForWsPath(wsPath: string): Atom<readonly LinkedMention[]>
ensureWorkspaceIndexed(wsName: string): void
rebuildWorkspaceIndex(wsName: string): Promise<void>
clearWorkspaceIndex(wsName: string): void
```

Use the exact local atom pattern that best fits existing service conventions
when implementing; the API above is a design target, not a required final
signature.

### Link Graph Index

The first sub-index should compute links only.

For every Markdown note:

- read the current Markdown text;
- call the existing canonical link extraction and resolution helpers;
- store outgoing targets under the source `wsPath`;
- update reverse incoming sets for each target.

Linked mentions then become a pure read:

```text
currentWsPath -> incomingByTarget.get(currentWsPath)
```

The UI can keep showing prior results while the service marks the index stale
or rebuilding.

### File Event Handling

Use file event payloads instead of global counters wherever possible.

Expected behavior:

- `file-create`: add the new path to the workspace index and index that file if
  it is Markdown.
- `file-content-update`: reread and reindex only that source note.
- `file-delete`: remove the deleted source's outgoing links and remove it from
  all reverse backlink sets.
- `file-rename`: move the source key from `oldWsPath` to `wsPath`, then reread
  the renamed file; do not rewrite other note contents.
- `event::file:force-update`: mark affected workspace indexes stale and
  schedule a full rebuild.

If an incremental update fails because a file is missing, permission is lost, or
the read is aborted, keep the last known index data and mark the workspace
stale or errored. Do not clear backlinks to empty unless deletion is confirmed.

### Async And Cancellation

Full rebuilds should:

- snapshot the workspace file list at rebuild start;
- create an `AbortController`;
- use bounded concurrency for reads;
- update progress without excessive atom churn;
- ignore completions from old generations;
- preserve prior ready data until the new generation completes.

Rapid file changes should be coalesced per `wsPath`. Multiple updates to the
same note should result in one latest reindex task when practical.

### Persistence

Persisted snapshots should be a second phase after the in-memory service is
stable.

Potential provider interface:

```ts
type WorkspaceIndexSnapshot = {
  schemaVersion: number;
  wsName: string;
  generatedAt: number;
  fileVersions: Record<string, { mtime?: number }>;
  linkGraph: {
    outgoingBySource: Record<string, string[]>;
  };
};

interface WorkspaceIndexCacheProvider {
  readSnapshot(wsName: string): Promise<WorkspaceIndexSnapshot | undefined>;
  writeSnapshot(wsName: string, snapshot: WorkspaceIndexSnapshot): Promise<void>;
  clearWorkspace(wsName: string): Promise<void>;
  clearAll(): Promise<void>;
}
```

Initial validity can compare known paths and `mtime` where available. If
metadata is missing or unreliable, load the snapshot as stale and rebuild in
the background.

### Future Indexes

Do not start with a generic plugin framework. Begin with typed fields on one
service:

- `linkGraph`
- `search`
- `noteMetadata`

Extract a generic indexer interface only after the second real index lands and
the shared lifecycle is proven.

Possible future interface:

```ts
interface WorkspaceIndexer<TSnapshot> {
  id: string;
  build(ctx: WorkspaceIndexBuildContext): Promise<TSnapshot>;
  update(
    ctx: WorkspaceIndexUpdateContext,
    change: WorkspaceFileChange,
    previous: TSnapshot,
  ): Promise<TSnapshot>;
}
```

## Migration Plan

### Phase 0: Lightweight Backlink Index

Completed in the release branch as a scoped cleanup:

- `WorkspaceStateService.$backlinkIndex` builds an in-memory reverse backlink
  map for the active workspace.
- `LinkedMentions` renders the service state and no longer reads files from
  React.
- Failed rebuilds keep previous backlink data and expose an error state.
- Extensionless Markdown backlink extraction now resolves through the known
  note index instead of guessing `.md` before `.markdown`.

This phase deliberately does not introduce the full `WorkspaceIndexService`,
incremental graph updates, persisted snapshots, or reusable index lifecycle.

### Phase 1: Dedicated Workspace Index Service

- Add `WorkspaceIndexService` in `packages/core/service-core`.
- Wire it into service initialization with dependencies on file-system and
  workspace state services.
- Move the current backlink indexing logic out of `WorkspaceStateService`.
- Build an in-memory link graph for the active workspace.
- Subscribe to file events and update the graph incrementally.
- Expose backlinks for a target note.

### Phase 2: Robust Lifecycle

- Add stale, building, ready, and error states.
- Add generation handling and abort old rebuilds.
- Add progress reporting suitable for future UI.
- Add explicit clear/rebuild APIs.
- Add tests for cancellation, stale completions, and failed reads.

### Phase 3: Persisted Snapshot Cache

- Add a platform-backed cache provider.
- Store link graph snapshots with schema versions and file metadata.
- Load snapshots on workspace activation.
- Rebuild stale snapshots in the background.
- Add migration/clear behavior for version changes.

### Phase 4: Search And Metadata

- Add note metadata extraction on the same lifecycle.
- Add a full-text search index using the same workspace cache mechanism.
- Replace any remaining UI-side full workspace scans with service-backed atoms.

## Verification

Required checks for implementation PRs:

- `pnpm lint:ci`
- `pnpm test:ci`
- Relevant filtered Vitest suites while iterating.
- Playwright E2E coverage for linked mentions showing:
  - initial backlinks;
  - update after editing a source note;
  - update after deleting or renaming a source note;
  - reload/persistence behavior once snapshots exist.
- `pnpm e2e:ci` before release or PR completion when user-visible behavior
  changes.

Add unit tests for:

- full build creates correct outgoing and incoming link maps;
- one source content update updates only that source's outgoing links;
- delete removes stale backlinks;
- rename preserves source identity under the new path;
- read failure keeps previous data and marks the index stale/error;
- old async generations cannot overwrite newer results.

## Known Blockers

- The exact service atom shape should follow local service/Jotai conventions
  after inspecting nearby service APIs during implementation.
- Persisted snapshots need a platform ownership decision and schema versioning.
- Native FS metadata may not be reliable enough for perfect snapshot validity;
  stale-while-revalidate should be the default fallback.

## Next Steps

- Inspect service initialization and event wiring before choosing final
  constructor dependencies for `WorkspaceIndexService`.
- Move the temporary `WorkspaceStateService.$backlinkIndex` implementation into
  the dedicated service.
- Add incremental create, update, delete, rename, and force-refresh behavior.
- Add tests for cancellation, stale completions, delete, rename, and failed
  reads.
- Re-run linked-mentions E2E and root validation.
