# Bangle.io

[Bangle.io](http://Bangle.io) is a modern web based note taking platform.

### You own your notes

- **Local:** Modify notes right from your computer. Think Notion, but local only.

- **No data lock-in:** bangle stores your notes in a human readable **_Markdown_** format.

### Not your usual note taking app

- **WYSIWYG**: Even though we save things in Markdown format, Bangle will enrich your eyes with rich text formatting.

- **Modern rich text editor:** Bangle uses its sister project [bangle.dev](https://github.com/bangle-io/bangle.dev) which unlocks us to build a powerful editor like [Notion](https://www.notion.so/) or [Dropbox paper](https://www.dropbox.com/paper) and support real time collaboration.

- **Extensibility:** Even though it's a web app it was built ground up to be extended by awesome extensions. (_We have bunch of community extensions coming out soon.)_

### Portability at its core

- **No Electron:** :heart: for web and speed, thats it.

- **Performant:** Throw thousands of notes at it and Bangle will chug along fine. _(Try opening a heavy project like [10,000 Markdown Files](https://github.com/Zettelkasten-Method/10000-markdown-files).)_

### Usage

Head to <https://bangle.io> to use the app.

### Self-hosting / bring your own server

Bangle.io can store a workspace on a server you control over a small HTTP API —
use it with app.bangle.io, self-host the whole thing with Docker, or run it on
the desktop. See [docs/remote-file-storage.md](docs/remote-file-storage.md).

```bash
# Self-host the app + your notes in one container
docker build -f packages/tooling/remote-file-server/Dockerfile -t bangle-io .
docker run -p 8000:8000 -v bangle-data:/data bangle-io   # http://localhost:8000
```

### Development

- `pnpm install` to install

- `pnpm start` to start a development instance on `localhost:5173`

For parallel worktrees, run `eval "$(node scripts/dev-ports.js --env)"` first
to give dev, preview, Storybook, and Playwright servers deterministic ports for
that worktree.

Please read [Contributing.md](./CONTRIBUTING.md) for more details.

- [RANT.md](./RANT.md)

1. First item

2. Second item

3. Nested first

4. Nested second

5. Third item
