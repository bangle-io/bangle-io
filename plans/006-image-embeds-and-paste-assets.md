---
title: Image Embeds And Paste Assets
status: active
type: plan
archived: false
created: 2026-06-30
updated: 2026-08-01
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/587
  - https://github.com/bangle-io/bangle-io/pull/610
  - https://github.com/bangle-io/bangle-io/pull/661
related_issues:
  - https://github.com/bangle-io/bangle-io/issues/679
---

# Image Embeds And Paste Assets

## Summary

Add full image support to the Markdown editor while preserving Bangle.io's
local-first and Markdown-fidelity priorities.

The target behavior is:

- Existing Markdown images such as `![Alt](assets/pic.png "Title")` render
  correctly in the WYSIWYG editor.
- Missing or unreadable local images show a recoverable broken-image state but
  never erase or rewrite the original Markdown source.
- Pasting or dropping an image file stores the image as a workspace file,
  generates a safe deterministic Markdown path, and inserts a Markdown image
  node only after the file write succeeds.
- Selecting an image node opens an image-specific menu for attributes and
  sizing controls supported by Markdown-compatible state.

## Current Status

- PR #587 shipped workspace-backed asset paste/drop, relative Markdown paths,
  local image rendering, asset routing, write-before-insert ordering, and
  Playwright persistence coverage for images and PDFs.
- PR #610 fixed duplicate image nodes when browsers surface the same clipboard
  file through multiple transfer-list views.
- PR #661 added a discoverable **Upload file** slash action that reuses the
  existing durable asset pipeline for mapped insertion, cancellation, cleanup,
  and Markdown-backed image/link persistence. This completes the file-picker
  entry point; image metadata, replacement, sizing, and recovery UI remain.
- `packages/js-lib/banger-editor/src/image.ts` owns the image schema and
  Markdown parse/serialize behavior; `packages/core/editor/src/asset-file-plugin.ts`
  and `local-image-node-view.ts` own Bangle's durable asset workflow.
- The image-specific selected-node menu is not implemented. Editing `alt` and
  `title`, replacing an image, and any Markdown-compatible sizing controls
  remain the main unfinished scope in this plan.
- Failure and recovery coverage should still be expanded for permission loss,
  quota failures, and missing assets without document mutation.

## ProseKit Findings

- ProseKit represents image sizing as `width`/`height` node attrs (never
  encoded in `alt`), the model to follow for any sizing controls here.

Reference docs:

- https://prosekit.dev/references/extensions/image/
- https://prosekit.dev/examples/image-view/?framework=vue

## Scope

Shipped (PRs #587, #610, #661):

- Rendering existing Markdown images: relative, parent-relative,
  root-relative, `http:`/`https:`, and `data:image/...` sources.
- Persisting pasted and dropped image files into the active workspace before
  inserting editor content.
- Stable, safe Markdown image targets generated from stored file paths.
- `src`, `alt`, and `title` preserved through parse/serialize round trips.

Remaining:

- Add selected-image UI for editing image metadata and supported sizing.
- Expand unit and Playwright coverage for visible behavior and persistence,
  especially failure and recovery paths.

## Out Of Scope

- Uploading images to remote hosting.
- Transforming, compressing, or transcoding image bytes.
- Supporting arbitrary HTML `<img>` from Markdown while `markdown-it` is
  configured with `html: false`.
- Making image assets first-class navigable notes in the sidebar.
- Automatically deleting unused image assets when Markdown references are
  removed. That should be a separate garbage-collection design.
- Implementing drag-to-resize in the first shipped version unless width/height
  attr support lands cleanly first.

## Design

### Package Ownership

Keep `packages/js-lib/banger-editor` generic (schema, attrs, commands, error
callbacks); it must not import Bangle workspace services. Bangle-specific
storage behavior lives in `packages/core/editor` under `PmEditorService`,
which already knows the mounted editor views, the current note `wsPath`,
`FileSystemService`, app error reporting, and the editor save lifecycle.

### Shipped Rendering And Persistence

Rendering, paste/drop persistence, and asset path generation shipped via
`packages/core/editor/src/asset-file-plugin.ts`,
`packages/core/editor/src/local-image-node-view.ts`, and
`packages/core/service-core/src/workspace-asset-storage.ts`. The shipped
paste/drop mechanism is that asset-file-plugin pipeline — `extensions.ts`
calls plain `setupImage()`; there is no `createImageNodes` callback.

### Image Node Schema

Initial attrs:

- `src`: required Markdown source string.
- `alt`: optional Markdown alt text.
- `title`: optional Markdown title.

Preferred sizing attrs:

- `width`: optional positive integer.
- `height`: optional positive integer.

If width/height attrs are added, update Markdown serialization intentionally.
CommonMark image syntax has no standard width/height fields, so the first
release should either:

- keep width/height editor-only and avoid serializing them, or
- defer sizing until a Markdown-compatible representation is chosen.

Do not encode scale in `alt` like legacy did. That mixes display metadata with
accessibility text.

### Selected Image Menu

Add a selected-image floating menu similar to link and wiki-link menus.

Initial controls:

- edit alt text;
- edit title;
- copy Markdown image path;
- replace image file;
- remove image node;
- reset size if width/height attrs are introduced.

Later controls:

- width presets;
- natural-size restore;
- drag resize;
- open containing asset location if assets become visible in file UI.

The menu should appear only when the editor selection is a `NodeSelection` over
an image node.

## Implementation Plan

Phases 1-3 (Markdown/path fidelity, local image rendering, and paste/drop
persistence) shipped in PRs #587, #610, and #661.

### Phase 4: Image Menu

- Add selection detection for image nodes.
- Add a floating menu component in `core/editor/src/components`.
- Wire commands for `alt`, `title`, remove, copy path, and replace.
- Add component/unit tests for command behavior.
- Add Playwright coverage for editing alt/title and verifying Markdown output.

### Phase 5: Polish And Recovery

- Decide whether width/height attrs ship now or wait.
- Add user-visible error messages through `t`.
- Ensure Native FS permission failures and IndexedDB quota failures are
  distinguishable in errors.
- Consider whether pasted image file creation should trigger workspace file
  tree refresh even though images are not note files.
- Add manual smoke steps for Browser and Native FS workspaces.

## Verification

Documentation-only changes to this plan require only verifying the documented
paths and commands.

When implementing the feature, run:

- `pnpm lint:ci`
- `pnpm test:ci`
- relevant Playwright E2E while iterating
- `pnpm e2e:ci` before release readiness
- `pnpm local-ci-check` before PR/release

Run `pnpm build` if implementation touches bootstrapping, build config,
dependencies, environment variables, themes, or production-only behavior.

Manual smoke for release candidate:

- Create a Browser workspace.
- Create a note.
- Paste an image.
- Confirm a Markdown image is inserted.
- Reload and confirm image remains visible.
- Confirm the stored Markdown points at a workspace file, not a `data:` URL.
- Repeat the affected path for Native FS if Native FS behavior changed.

## Known Blockers And Risks

- Current `FileSystemService.listFiles()` filters to note extensions. This is
  good for navigation, but future agents should not assume assets appear in
  `$wsPaths`.
- Native FS writes can fail due to permission loss. Do not insert image nodes
  before writes finish.
- IndexedDB writes can fail due to quota. Surface this distinctly enough that
  users understand the paste did not complete.
- Object URLs must be revoked. Leaking them during editor updates or navigation
  is easy.
- Markdown image syntax does not support width/height. Avoid inventing hidden
  serialization that harms interoperability.
- Renaming or moving notes will not automatically move assets. Tracked as
  https://github.com/bangle-io/bangle-io/issues/679. Root-level
  `assets/<note-stem>/` reduces ambiguity but does not solve lifecycle
  cleanup.

## Next Steps

- Implement the selected-image menu (Phase 4).
- Add recovery and permission-failure coverage (Phase 5).
