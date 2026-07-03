import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const baseUrl = process.env.BANGLE_E2E_BASE_URL ?? 'http://127.0.0.1:5173';
const serverLogPrefix = '[E2E WebServer]';

function pipeWithPrefix(
  stream: NodeJS.ReadableStream | null,
  target: NodeJS.WritableStream,
) {
  stream?.setEncoding('utf8');
  stream?.on('data', (chunk: string) => {
    for (const line of chunk.split(/\r?\n/)) {
      if (line.length > 0) {
        target.write(`${serverLogPrefix} ${line}\n`);
      }
    }
  });
}

function spawnCommand(
  command: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; stdio?: 'inherit' | 'pipe' } = {},
) {
  return spawn(command, args, {
    cwd: packageRoot,
    env: options.env ?? process.env,
    stdio: options.stdio ?? 'inherit',
  });
}

async function waitForServer(
  url: string,
  getServerExited: () => boolean,
  timeoutMs = 60_000,
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (getServerExited()) {
      throw new Error('E2E web server exited before it became ready.');
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the server is ready or the timeout expires.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for E2E web server at ${url}.`);
}

async function runChild(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
) {
  const child = spawnCommand(command, args, { env, stdio: 'inherit' });
  const exitCode = await new Promise<number>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });

  return exitCode;
}

async function main() {
  let serverExited = false;
  const server = spawnCommand(
    'pnpm',
    [
      '--dir',
      '../browser-entry',
      'exec',
      'vite',
      '--configLoader',
      'runner',
      '--host',
      '127.0.0.1',
      '--port',
      '5173',
      '--strictPort',
    ],
    { stdio: 'pipe' },
  );

  pipeWithPrefix(server.stdout, process.stdout);
  pipeWithPrefix(server.stderr, process.stderr);

  server.once('exit', () => {
    serverExited = true;
  });

  const stopServer = () => {
    if (!server.killed) {
      server.kill('SIGTERM');
      setTimeout(() => {
        if (!server.killed) {
          server.kill('SIGKILL');
        }
      }, 2_000).unref();
    }
  };

  process.once('SIGINT', () => {
    stopServer();
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    stopServer();
    process.exit(143);
  });

  try {
    await waitForServer(baseUrl, () => serverExited);
    const exitCode = await runChild('pnpm', ['run', 'test'], {
      ...process.env,
      BANGLE_E2E_BASE_URL: baseUrl,
      BANGLE_E2E_EXTERNAL_SERVER: '1',
      CI: '1',
    });

    process.exitCode = exitCode;
  } finally {
    stopServer();
  }
}

await main();
