---
title: Image Embeds And Paste Assets
status: planned
type: plan
archived: false
created: 2026-06-30
updated: 2026-06-30
owner: mixed
related_prs: []
related_issues: []
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

- Current editor setup already registers `setupImage()` from
  `@bangle.io/prosemirror-plugins` in
  `packages/core/editor/src/extensions.ts`.
- `packages/js-lib/banger-editor/src/image.ts` already defines an inline image
  node with `src`, `alt`, and `title`, Markdown parse/serialize support, input
  rules, paste handling, drop handling, and an `updateImageNodeAttribute`
  command.
- The default paste/drop behavior currently converts image files into `data:`
  URLs. That is acceptable as a generic fallback, but not as Bangle's released
  behavior because it bloats Markdown, bypasses workspace file persistence, and
  gives no durable asset name.
- `FileSystemService` can already create and read arbitrary workspace files by
  `wsPath`, but `listFiles()` currently filters the workspace tree to note
  extensions. Image assets should be stored and read without necessarily
  becoming navigable notes.
- Existing E2E fixtures include local missing images and data images in
  `packages/tooling/e2e-tests/src/fixtures/workspaces/markdown-edge-cases/04-links-and-images.md`.
  Preserve those cases.

## Legacy Findings

Legacy commit `ec3fd897` (`Feat/images (#62)`) is the useful first pass:

- `extensions/image-extension/parse-local-path.js` resolved Markdown image
  sources relative to the current note path.
- The image React node view left `http:`, `https:`, and `data:image/` sources
  alone.
- Local image sources were read through workspace storage, converted to object
  URLs with `URL.createObjectURL(file)`, and revoked during cleanup.
- Missing local files were silently tolerated in rendering; source Markdown was
  not rewritten.

Legacy commit `483aea18` (`Feat/image (#77)`) added the pasted-file flow:

- `create-image-nodes.js` accepted pasted/dropped image files, calculated image
  dimensions, created a workspace image path, saved the original file, and then
  returned image nodes.
- `image-writing.js` placed files under a configured image save directory and
  returned both a storage `wsPath` and a Markdown `srcUrl`.
- `image-file-helpers.js` added filename helpers for dimensions, timestamps,
  and scale metadata.
- `ImageEditorReactComponent.jsx` showed a selected-image floating menu with
  scale controls.

Do not copy this implementation directly. Reuse the product ideas, but adapt
them to the current package boundaries, TypeScript code, service wiring, and
data-safety rules.

## ProseKit Findings

ProseKit's current image design is a useful reference:

- Image file ingestion is handled through an uploader callback rather than
  hardcoded inside the base image extension.
- The editor can show upload/progress/error state through image-specific views.
- Image attrs support `src`, `alt`, `title`, `width`, and `height`.
- Resizing is represented in node attrs instead of encoding sizing in `alt`.

Reference docs:

- https://prosekit.dev/references/extensions/image/
- https://prosekit.dev/examples/image-view/?framework=vue

## Scope

- Render existing Markdown images in the editor for:
  - relative paths such as `assets/pic.png` and `./assets/pic.png`;
  - parent-relative paths such as `../assets/pic.png`;
  - root-relative workspace paths such as `/assets/pic.png`;
  - `http:` and `https:` URLs;
  - `data:image/...` URLs.
- Persist pasted and dropped image files into the active workspace before
  inserting editor content.
- Generate stable, safe Markdown image targets from stored file paths.
- Preserve `src`, `alt`, and `title` through parse/serialize round trips.
- Add selected-image UI for editing image metadata and supported sizing.
- Add unit and Playwright coverage for visible behavior and persistence.

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

Keep `packages/js-lib/banger-editor` generic. It may expose better extension
hooks, attrs, commands, and error callbacks, but it must not import Bangle
workspace services.

Put Bangle-specific storage behavior in `packages/core/editor`, owned by
`PmEditorService`, because that service already knows:

- the mounted editor views;
- the current note `wsPath`;
- `FileSystemService`;
- app error reporting;
- editor save lifecycle.

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

### Reading Existing Markdown Images

Add an image node view in `core/editor` that receives the current note `wsPath`
through service configuration or view metadata.

Rendering rules:

- If `src` starts with `http://`, `https://`, or `data:image/`, render it
  directly.
- If `src` has another explicit URL scheme, render a blocked/broken state.
- If `src` is relative or root-relative, resolve it against the current note.
- Reject paths that escape the workspace root or contain unsafe encoded
  separators.
- Read the target file with `fileSystem.readFile(imageWsPath)`.
- Create an object URL for the returned `File`.
- Revoke the previous object URL when attrs change, the node view updates, or
  the node view is destroyed.
- If the file is missing or unreadable, show a visible broken-image state with
  useful alt text but never dispatch a document change.

Path resolution should live in the lowest valid shared layer if it is reused by
links or other asset types. `@bangle.io/ws-path` is the likely home for a typed
helper such as `resolveWorkspaceAssetPath(currentWsPath, markdownTarget)`.

### Pasting And Dropping Images

Configure `setupImage({ createImageNodes })` from `PmEditorService`.

The custom `createImageNodes` must:

- accept a list of image `File` objects;
- identify the current note path from the editor view;
- sanitize the original file name;
- preserve the original extension when safe and known;
- derive an image directory;
- generate a unique target `wsPath`;
- optionally calculate dimensions using a temporary object URL;
- await `fileSystem.createFile(targetWsPath, file)`;
- only create and return the image node after the file write succeeds;
- emit an app error and return no node on failure.

Do not insert a Markdown image reference before persistence succeeds. A failed
write must not leave the note pointing at an image file that does not exist.

### Asset Location And Naming

Recommended initial location:

```text
assets/<note-stem>/<sanitized-original-name>-<timestamp>-<width>x<height>.<ext>
```

Example:

```text
assets/research-note/screenshot-20260630142530123-1280x720.png
```

For notes inside folders, keep asset paths workspace-rooted under `assets/`
rather than beside the note unless the product wants Obsidian-style colocated
assets. Rooted `assets/` has simpler sidebar filtering and fewer rename/move
implications.

Collision policy:

- Check `fileSystem.exists(targetWsPath)`.
- If occupied, append `-2`, `-3`, etc. before the extension.
- Keep the original source file bytes unchanged.

Markdown insertion policy:

- Insert a relative Markdown URL from the current note to the asset path.
- URL-encode path segments for Markdown.
- Keep the stored filesystem `wsPath` decoded.

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

### Phase 1: Markdown And Path Fidelity

- Add focused round-trip tests for image Markdown:
  - `![alt](assets/pic.png)`;
  - `![alt](assets/pic.png "title")`;
  - paths with spaces and parentheses;
  - data image source;
  - image beside wiki links and normal links.
- Add or reuse a typed resolver for Markdown asset targets.
- Cover relative, root-relative, encoded space, `..`, and workspace-escape
  cases.

### Phase 2: Local Image Rendering

- Add a Bangle image node view that resolves and reads local image files.
- Ensure object URL lifecycle is tested.
- Add broken-image UI state without document mutation.
- Add Playwright coverage for loading an existing local image from a fixture
  workspace.
- Add Playwright coverage that missing images do not erase the Markdown source
  after edit/reload.

### Phase 3: Paste And Drop Persistence

- Add Bangle-specific `createImageNodes` wiring in `PmEditorService`.
- Add filename sanitization and collision-resistant path generation.
- Add dimension calculation if it is reliable and does not block too long.
- Await `fileSystem.createFile` before returning nodes.
- Route failures through `emitAppError`.
- Add tests for success, collision, invalid image names, and write failure.
- Add Playwright coverage that paste creates an image file, inserts Markdown,
  reloads, and still renders.

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
- Renaming or moving notes will not automatically move assets in the initial
  design. Root-level `assets/<note-stem>/` reduces ambiguity but does not solve
  lifecycle cleanup.

## Next Steps

- Confirm the asset directory convention: root `assets/<note-stem>/` versus
  colocated `./assets/<note-stem>/`.
- Implement Phase 1 path/Markdown tests first.
- Implement local image node view before paste persistence so existing
  Markdown fixtures drive the rendering behavior.
- Implement pasted-image persistence with failure-first tests before UI polish.
