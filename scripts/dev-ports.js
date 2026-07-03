import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PORT_BUCKET_COUNT = 800;
export const MIN_DEV_PORT = 3000;
export const MAX_PORT = 65_535;

export const PORT_ROLES = {
  dev: {
    base: 5173,
    env: 'BANGLE_DEV_PORT',
  },
  preview: {
    base: 4173,
    env: 'BANGLE_PREVIEW_PORT',
  },
  storybook: {
    base: 6006,
    env: 'BANGLE_STORYBOOK_PORT',
  },
  e2e: {
    base: 7173,
    env: 'BANGLE_E2E_PORT',
  },
  'e2e-ct': {
    base: 3100,
    env: 'BANGLE_E2E_CT_PORT',
  },
};

function execGit(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function hashToSlot(seed, bucketCount = PORT_BUCKET_COUNT) {
  const digest = createHash('sha256').update(seed).digest();
  return digest.readUInt32BE(0) % bucketCount;
}

function parsePort(value, envName) {
  if (value === undefined || value === '') {
    return undefined;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < MIN_DEV_PORT || port > MAX_PORT) {
    throw new Error(
      `${envName} must be an integer port from ${MIN_DEV_PORT} to ${MAX_PORT}.`,
    );
  }

  return port;
}

function resolveSeed({ cwd = process.cwd(), explicitSeed } = {}) {
  if (explicitSeed) {
    return explicitSeed;
  }

  if (process.env.BANGLE_PORT_SEED) {
    return process.env.BANGLE_PORT_SEED;
  }

  const worktreeRoot = execGit(['rev-parse', '--show-toplevel'], cwd) || cwd;
  const branch =
    execGit(['branch', '--show-current'], cwd) ||
    execGit(['rev-parse', '--short', 'HEAD'], cwd) ||
    basename(worktreeRoot);

  return `${worktreeRoot}:${branch}`;
}

export function getDevPorts(options = {}) {
  const seed = resolveSeed(options);
  const slot = hashToSlot(seed, options.bucketCount);
  const ports = {};

  for (const [role, config] of Object.entries(PORT_ROLES)) {
    ports[role] =
      parsePort(process.env[config.env], config.env) ?? config.base + slot;
  }

  return {
    seed,
    slot,
    ports,
  };
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function printHelp() {
  console.log(`Usage: node scripts/dev-ports.js [role] [--env|--json]

Print deterministic development ports for this git worktree.

Roles:
${Object.keys(PORT_ROLES)
  .map((role) => `  ${role}`)
  .join('\n')}

Examples:
  node scripts/dev-ports.js
  node scripts/dev-ports.js dev
  eval "$(node scripts/dev-ports.js --env)"
  BANGLE_PORT_SEED=my-worktree node scripts/dev-ports.js --json
`);
}

function parseArgs(args) {
  const parsed = {
    format: 'text',
    role: undefined,
    seed: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      parsed.format = 'help';
      continue;
    }

    if (arg === '--env') {
      parsed.format = 'env';
      continue;
    }

    if (arg === '--json') {
      parsed.format = 'json';
      continue;
    }

    if (arg === '--seed') {
      const seed = args[index + 1];
      if (!seed) {
        throw new Error('--seed requires a non-empty value.');
      }
      parsed.seed = seed;
      index += 1;
      continue;
    }

    if (arg.startsWith('--seed=')) {
      parsed.seed = arg.slice('--seed='.length);
      if (!parsed.seed) {
        throw new Error('--seed requires a non-empty value.');
      }
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (parsed.role) {
      throw new Error(`Only one port role can be requested.`);
    }
    parsed.role = arg;
  }

  if (parsed.role && !Object.hasOwn(PORT_ROLES, parsed.role)) {
    throw new Error(`Unknown port role: ${parsed.role}`);
  }

  return parsed;
}

export function formatDevPorts(result, format, role) {
  if (format === 'json') {
    return `${JSON.stringify(result, null, 2)}\n`;
  }

  if (format === 'env') {
    const lines = [
      `export BANGLE_PORT_SEED=${shellQuote(result.seed)}`,
      `export BANGLE_PORT_SLOT=${result.slot}`,
    ];

    for (const [portRole, config] of Object.entries(PORT_ROLES)) {
      lines.push(`export ${config.env}=${result.ports[portRole]}`);
    }

    return `${lines.join('\n')}\n`;
  }

  if (role) {
    return `${result.ports[role]}\n`;
  }

  const lines = [
    `seed: ${result.seed}`,
    `slot: ${result.slot}`,
    ...Object.keys(PORT_ROLES).map((portRole) => {
      const config = PORT_ROLES[portRole];
      return `${portRole}: ${result.ports[portRole]} (${config.env})`;
    }),
  ];

  return `${lines.join('\n')}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (args.format === 'help') {
      printHelp();
      return;
    }

    const result = getDevPorts({ explicitSeed: args.seed });
    process.stdout.write(formatDevPorts(result, args.format, args.role));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
