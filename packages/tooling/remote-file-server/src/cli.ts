#!/usr/bin/env node
import fs from 'node:fs/promises';
import process from 'node:process';
import { readConfigFromEnv } from './config';
import { DiskRemoteFileStore } from './disk-store';
import { startRemoteFileServer } from './server';

async function main(): Promise<void> {
  const config = readConfigFromEnv();
  await fs.mkdir(config.root, { recursive: true });

  const store = new DiskRemoteFileStore(config.root);
  const started = await startRemoteFileServer({
    store,
    token: config.token,
    name: config.name,
    staticDir: config.staticDir,
    // In bundled mode, tell the app it can default a workspace to this origin.
    htmlInject: config.staticDir
      ? '<script>window.__BANGLE_REMOTE__={"bundled":true};</script>'
      : undefined,
    port: config.port,
    host: config.host,
  });

  console.log(`[remote-file-server] listening on ${started.url}`);
  console.log(`[remote-file-server] data root: ${config.root}`);
  console.log(
    `[remote-file-server] auth: ${config.token ? 'bearer token required' : 'open (no token)'}`,
  );
  if (config.staticDir) {
    console.log(
      `[remote-file-server] serving front-end from: ${config.staticDir}`,
    );
  }

  const shutdown = async () => {
    console.log('\n[remote-file-server] shutting down…');
    await started.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[remote-file-server] failed to start', error);
  process.exit(1);
});
