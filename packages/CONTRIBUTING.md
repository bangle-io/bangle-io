> THIS is WIP

## Contributing

**pnpm**

Need pnpm installed

```bash
corepack prepare --activate  && pnpm install
```

**Install dependencies**

```bash
pnpm install
```

**Run the app**

```bash
pnpm start
```

**Run all CI checks locally (Recommended)**

```bash
pn biome check --fix --unsafe && pn local-ci-check
```

**Typecheck**

```bash
pnpm tsc -b -w
```

**Run all tests**

```bash
pnpm vitest
```

**Snapshot test update**

If you are in mac, you will need to run docker to update the snapshots.

CT Snapshot update
```bash
docker run -p 9323 -v $(pwd):/work/ mcr.microsoft.com/playwright:v1.51.1-noble bash -c 'cd work && corepack enable && corepack prepare --activate  && pnpm install  && pnpm run e2e-install && NODE_OPTIONS="--max-old-space-size=8144" pnpm run e2e-ct-update-snapshots'
```

Aria snapshot update

```bash
pn e2e-update-snapshots
```

**Run in playwright debug mode**

```bash
pnpm --filter "@bangle.io/e2e-tests" run test --debug
```


**Deployment**

App is deployed via netlify. 

Push to `staging` branch will deploy to https://staging.app.bangle.io/

Push to `production` branch will deploy to https://app.bangle.io/

