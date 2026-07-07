# @bangle.io/remote-file-server

A small, dependency-free Node.js server that implements the [Bangle.io remote
file-storage API](../../../docs/remote-file-storage.md). Point a Bangle.io
"Remote Server" workspace at it and your notes are stored as plain Markdown
files on the server's disk.

It can also serve the Bangle.io front-end itself, so a single container gives
you a fully self-hosted, local-first note app.

## Quick start

```bash
# From the repo root
BANGLE_FILE_SERVER_ROOT=./my-notes \
  pnpm --filter @bangle.io/remote-file-server start
# -> listening on http://localhost:8000
```

Then in Bangle.io (https://app.bangle.io or your own build):

1. **Create workspace → Remote Server**
2. **Server URL:** `http://localhost:8000`
3. Leave the token blank (this server is open by default).

Notes now live under `./my-notes/<workspace-name>/…` as real `.md` files.

## Configuration (environment variables)

| Variable | Default | Description |
| --- | --- | --- |
| `BANGLE_FILE_SERVER_PORT` | `8000` | Port to listen on (`PORT` also honoured). |
| `BANGLE_FILE_SERVER_HOST` | `0.0.0.0` | Interface to bind. |
| `BANGLE_FILE_SERVER_ROOT` | `./data` | Directory that holds workspace folders. |
| `BANGLE_FILE_SERVER_TOKEN` | _(none)_ | If set, every API call must send `Authorization: Bearer <token>`. |
| `BANGLE_FILE_SERVER_STATIC_DIR` | _(none)_ | Serve a built front-end from this dir at the same origin. |
| `BANGLE_FILE_SERVER_NAME` | `bangle-remote-file-server` | Name reported by `/api/v1/health`. |

## Docker (self-hosted app + storage)

Build an image that serves **both** the app and the API:

```bash
docker build -f packages/tooling/remote-file-server/Dockerfile -t bangle-io .
docker run -p 8000:8000 -v bangle-data:/data bangle-io
```

Open <http://localhost:8000>. Because the app is served from the same origin as
the API, the "Remote Server" workspace works with an empty/relative URL — no
configuration required. See [`docker-compose.yml`](./docker-compose.yml) for a
Compose setup with a persistent volume.

> This addresses the long-standing request for a Docker deployment of Bangle.io
> (see discussion #216): one container, your data on your disk.

## Build your own server

You do **not** have to use this package. The wire contract is documented in
[`docs/remote-file-storage.md`](../../../docs/remote-file-storage.md), and the
engine-neutral request router in `@bangle.io/remote-file-sync` lets you host it
on any framework. Minimal Express example:

```ts
import express from 'express';
import {
  createRemoteRouter,
  REMOTE_API_BASE,
} from '@bangle.io/remote-file-sync';
import { DiskRemoteFileStore } from '@bangle.io/remote-file-server';

const router = createRemoteRouter(new DiskRemoteFileStore('./data'), {
  token: process.env.TOKEN,
});

const app = express();
app.use(REMOTE_API_BASE, express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
  const response = await router({
    method: req.method,
    path: req.path, // already stripped of REMOTE_API_BASE by express
    query: req.query as Record<string, string>,
    headers: req.headers as Record<string, string>,
    body: req.body?.length ? new Uint8Array(req.body) : undefined,
  });
  res.status(response.status);
  for (const [k, v] of Object.entries(response.headers)) res.setHeader(k, v);
  res.end(response.body ? Buffer.from(response.body) : undefined);
});

app.listen(8000);
```

Implement your own storage backend by satisfying the `RemoteFileStore`
interface (e.g. S3, a database) and passing it to `createRemoteRouter`.
