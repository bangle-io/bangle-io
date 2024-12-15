# Project Instructions

Build the note-taking web app per these guidelines.

## Tech Stack

- React
- TypeScript
- Vite
- Vitest
- Playwright
- TailwindCSS
- ShadCN

## Project Structure

1. **core**: Business logic.
2. **platform**: Platform-specific abstractions (e.g., IndexedDB for browser).
3. **shared**: Shared code, types, constants.
4. **tooling**: Build tools and scripts.
5. **ui**: React components, use shared code.
6. **js-lib**: Independent libraries.

## Guidelines

- Write complete code; avoid shortcuts.
- Keep code comments unless explicitly instructed.

## WsPath Format

`wsPath` defines file or directory paths in the workspace:

- **File**: `<workspaceName>:<filePath>` (e.g., `myWorkspace:myNote.md`)
- **Directory**: `<workspaceName>:<dirPath>` (e.g., `myWorkspace:myDir/mySubDir`)

### Components:

- `workspaceName`: Workspace name.
- `filePath`: File path with extension.
- `dirPath`: Directory path.

