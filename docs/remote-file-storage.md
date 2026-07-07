# Remote file storage (bring your own server)

Bangle.io can store a workspace's notes on **your own server** instead of in the
browser or the local filesystem. You run a small server that speaks a simple
HTTP API; Bangle.io reads and writes Markdown files through it. Your notes never
touch Bangle.io's infrastructure.

The same protocol powers three deployments:

| Deployment | Front-end | Backend | Transport |
| --- | --- | --- | --- |
| **Bring your own server** | app.bangle.io (or your build) | your HTTP server | HTTPS |
| **Self-hosted / Docker** | served by your server | same server | same-origin HTTP |
| **Electron desktop** | in-app | the desktop app's main process | IPC |

The packages involved:

- [`@bangle.io/remote-file-sync`](../packages/js-lib/remote-file-sync) —
  engine-neutral protocol, request router, HTTP client, and an in-memory store.
  Zero dependencies; runs in the browser and Node.
- [`@bangle.io/remote-file-server`](../packages/tooling/remote-file-server) —
  a reference Node server (disk-backed) that also serves the app.

---

## 1. Bring your own server (with app.bangle.io)

Run the reference server anywhere you like:

```bash
git clone https://github.com/bangle-io/bangle-io
cd bangle-io && pnpm install
BANGLE_FILE_SERVER_ROOT=./notes \
BANGLE_FILE_SERVER_TOKEN=my-secret-token \
  pnpm --filter @bangle.io/remote-file-server start
# -> listening on http://localhost:8000
```

Put it behind HTTPS (a reverse proxy such as Caddy/nginx/Cloudflare Tunnel) so
your token is not sent in the clear. Then, in Bangle.io:

1. **Create Workspace → Remote Server**
2. **Server URL:** `https://notes.example.com`
3. **Access token:** `my-secret-token` (omit if your server has none)

The token is stored **locally in your browser only** (in the workspace metadata)
and sent as `Authorization: Bearer <token>`. Your server must send permissive
CORS headers so `app.bangle.io` can reach it — the reference server already does.

## 2. Self-hosted app + storage (Docker)

One container serves both the app and the API, so there is nothing to configure
in the UI (the workspace defaults to the same origin):

```bash
docker build -f packages/tooling/remote-file-server/Dockerfile -t bangle-io .
docker run -p 8000:8000 -v bangle-data:/data bangle-io
# open http://localhost:8000
```

Or with Compose (persistent named volume):

```bash
docker compose -f packages/tooling/remote-file-server/docker-compose.yml up --build
```

In this mode the app is served with a marker that lets the "Remote Server"
dialog prefill the URL with the current origin — create a workspace and go.

## 3. Electron desktop

The desktop app hosts the file store in its **main process** and exposes it to
the renderer over IPC. Choosing **Remote Server** on desktop pre-fills the URL
with the sentinel `bangle-desktop://local`; the renderer routes those requests
through IPC (no socket, no token). Files live under the app's user-data
directory (override with `BANGLE_DESKTOP_WORKSPACE_ROOT`). This reuses the exact
same provider and protocol as the HTTP path — see
[`remote-fs.ts`](../packages/tooling/desktop-entry/src/remote-fs.ts).

---

## The HTTP API

All routes are mounted under `/api/v1`. A **path** (`fsPath`) is a POSIX,
workspace-scoped path whose first segment is the workspace name, e.g.
`myNotes/journal/2024.md`. It never contains `.`/`..` segments or a leading `/`.

Authentication: if the server is configured with a token, every request except
`GET /health` must include `Authorization: Bearer <token>`, otherwise it returns
`401`.

| Method & path | Purpose | Success | Errors |
| --- | --- | --- | --- |
| `GET /health` | Liveness + capabilities | `200` `{name, apiVersion, workspaces?}` | — |
| `GET /files?ws=<ws>` | List a workspace's files | `200` `{paths: string[]}` | `401` |
| `GET /file?path=<fsPath>` | Read file bytes | `200` bytes + stat headers | `404` |
| `HEAD /file?path=<fsPath>` | Existence + stat | `200` / `404` | — |
| `POST /file?path=<fsPath>` | Create (body = bytes) | `201` | `409` exists |
| `PUT /file?path=<fsPath>` | Overwrite existing (body = bytes) | `200` | `404` missing |
| `DELETE /file?path=<fsPath>` | Delete | `200` | `404` missing |
| `POST /rename` `{from,to}` | Rename/move | `200` | `404` source missing |
| `GET /stat?path=<fsPath>` | File timestamps | `200` `{ctime, mtime}` | `404` |

Read/stat responses carry `x-bangle-mtime` and `x-bangle-ctime` headers
(milliseconds since epoch). Every non-2xx response is JSON:
`{ "error": "<code>", "message"?: "…" }` where `<code>` is one of
`not-found`, `already-exists`, `invalid-path`, `unauthorized`, `bad-request`,
`network`, `server-error`.

### Behavioural contract (data safety)

- `POST` must **not** overwrite an existing file (`409`).
- `PUT` must **not** create a missing file (`404`) — writes only target existing
  notes so a lost read never turns into an empty write.
- Reads of a missing file return `404`; the client treats that as "absent", never
  as empty content.
- Paths are validated server-side; traversal outside the storage root is rejected.

### curl examples

```bash
BASE=http://localhost:8000/api/v1
AUTH='-H "Authorization: Bearer my-secret-token"'

curl $BASE/health
curl -X POST  "$BASE/file?path=demo/hello.md" --data-binary 'Hello'   # create
curl          "$BASE/file?path=demo/hello.md"                          # read
curl -X PUT   "$BASE/file?path=demo/hello.md" --data-binary 'Hello v2' # write
curl          "$BASE/files?ws=demo"                                    # list
curl -X POST  "$BASE/rename" -d '{"from":"demo/hello.md","to":"demo/hi.md"}'
curl -X DELETE "$BASE/file?path=demo/hi.md"                            # delete
```

---

## Build your own server

You don't have to use the reference server. Two building blocks make it easy:

**`createRemoteRouter(store, { token })`** turns any `RemoteFileStore` into an
engine-neutral request handler, so you only write a thin transport adapter. The
[server README](../packages/tooling/remote-file-server/README.md#build-your-own-server)
has a complete Express example.

**Implement `RemoteFileStore`** to back the API with anything — S3, a database,
git — by satisfying this interface (from `@bangle.io/remote-file-sync`):

```ts
interface RemoteFileStore {
  list(wsName, signal?): Promise<string[]>;
  read(fsPath, signal?): Promise<{ bytes, stat } | undefined>;
  stat(fsPath, signal?): Promise<{ ctime, mtime } | undefined>;
  create(fsPath, bytes, signal?): Promise<void>;   // throw already-exists
  write(fsPath, bytes, signal?): Promise<void>;     // throw not-found
  delete(fsPath, signal?): Promise<void>;           // throw not-found
  rename(from, to, signal?): Promise<void>;         // throw not-found
  listWorkspaces?(signal?): Promise<string[]>;
}
```

Throw `RemoteFileError('already-exists' | 'not-found' | 'invalid-path')` where
the contract requires it and the router maps it to the right HTTP status. Add
contract tests with the in-memory store as a reference implementation.
