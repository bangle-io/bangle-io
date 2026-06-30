# Cloudflare Pages CLI setup

Bangle.io deploys through Cloudflare Pages from the `kepta/bangle-io-2`
repository. The repo now pins Wrangler locally so Cloudflare commands use the
same version in local development and automation.

## Current deployment model

- Cloudflare account: `ba7e8ef8ee2a44223f0b89824d3e4e83`.
- Production domain: `https://app.bangle.io/`.
- Production branch: `production`.
- Staging branches in app config: `main` and `staging`.
- Build command: `pnpm build`.
- Pages build output directory: `packages/tooling/browser-entry/dist`.

The app derives runtime environment from Cloudflare Pages system variables:

- `CF_PAGES=1` marks a Pages build.
- `CF_PAGES_BRANCH=production` maps to `appEnv: production`.
- `CF_PAGES_BRANCH=main` or `staging` maps to `appEnv: staging`.
- Any other branch maps to `appEnv: dev/<branch>`.

## First-time local CLI setup

Run from the repository root:

```bash
pnpm install
pnpm cf:login
pnpm cf:whoami
pnpm cf:pages:list
```

If `pnpm cf:login` opens Cloudflare in a browser, complete the OAuth flow with
an account that can read and write Pages projects in the Cloudflare account
above.

For non-interactive shells and CI, use a scoped Cloudflare API token instead of
OAuth:

```bash
export CLOUDFLARE_API_TOKEN=<token>
pnpm cf:whoami
```

The token needs enough access to read Pages projects, download Pages config,
and deploy Pages builds for the account above.

## Pull dashboard config before committing Wrangler config

Do not hand-write `wrangler.jsonc` for this existing Pages project. Cloudflare
recommends downloading the dashboard config first because a Pages Wrangler file
becomes the source of truth for the project once it includes
`pages_build_output_dir`.

After confirming the project name from `pnpm cf:pages:list`, run:

```bash
pnpm cf:pages:download-config <PROJECT_NAME>
```

To intentionally replace an existing generated config:

```bash
pnpm cf:pages:download-config <PROJECT_NAME> --force
```

Review the generated `wrangler.jsonc` before committing it. Confirm it matches
the dashboard for:

- project `name`
- `pages_build_output_dir`
- `compatibility_date`
- production bindings and variables
- preview bindings and variables

Cloudflare Pages Wrangler config only supports `env.production` and
`env.preview`. It does not support separate branch-specific config for
`main`, `staging`, and arbitrary preview branches. Branch selection still lives
in Pages branch deployment controls.

The `bangle-io-2` dashboard config downloaded on 2026-06-30 generated
`wrangler.toml` with:

```toml
name = "bangle-io-2"
pages_build_output_dir = "packages/tooling/browser-entry/dist"
compatibility_date = "2025-05-11"

[env.production]
compatibility_date = "2026-04-21"
```

The same account also has:

- `bangledev` for `bangledev.pages.dev` and `dev.app.bangle.io`.
- `bangle-io-landing` for `bangle-io-landing.pages.dev` and `bangle.io`.

## Dashboard settings to verify

In Cloudflare Dashboard > Workers & Pages > the Bangle Pages project:

- Settings > Builds & deployments
  - Production branch is `production`.
  - Production deployments are enabled only for the production branch.
  - Preview deployments include `main` and `staging`.
  - Decide whether all other branches should deploy previews or whether preview
    deploys should be limited to `main`, `staging`, and selected release/test
    branch patterns.
- Settings > Environment variables
  - Production and preview have the intended Sentry token and any future
    build-time variables.
  - No production-only secret is present in preview unless deliberately shared.
- Settings > Functions
  - Any Pages Functions bindings are separated between production and preview
    resources.

Observed deployment behavior on 2026-06-30:

- `bangle-io-2`: `production` deploys as Production. `main`, `staging`,
  `release/*`, and `codex/*` branches deploy as Preview.
- `bangledev`: `main` deploys as Production. `production`, `staging`,
  `release/*`, and `codex/*` branches deploy as Preview. Recent `main`
  production deployments were failing in Cloudflare.

## Manual deploy commands

These scripts assume `pnpm build` has already produced
`packages/tooling/browser-entry/dist`.

```bash
pnpm build
pnpm cf:pages:deploy:staging
pnpm cf:pages:deploy:production
```

Prefer the documented release flow for production: push to the `production`
branch on the `deploy` remote after the required local checks and manual smoke
test. Use direct Wrangler deploys only when intentionally bypassing Git
integration.

## Testing checklist

Before a Cloudflare setup change is treated as ready:

```bash
pnpm lint:ci
pnpm test:ci
pnpm build
```

For release-affecting setup changes, also run:

```bash
pnpm local-ci-check
```

Then use Playwright CLI against the release candidate and smoke the local-first
persistence path: create a Browser workspace and note, edit it, reload, and
verify the content remains.
