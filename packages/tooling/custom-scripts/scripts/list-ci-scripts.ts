import { readFile } from 'node:fs/promises';

import { isMainModule } from '../lib';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function listCiScripts(packageJson: unknown): string[] {
  if (!isRecord(packageJson) || !isRecord(packageJson.scripts)) {
    throw new Error('package.json must define a scripts object.');
  }

  const scripts = Object.keys(packageJson.scripts)
    .filter((script) => script.endsWith(':ci'))
    .sort()
    .reverse();

  if (scripts.length === 0) {
    throw new Error('package.json does not define any scripts ending in :ci.');
  }

  return scripts;
}

export async function readCiScripts(
  packageJsonPath = 'package.json',
): Promise<string[]> {
  const packageJson: unknown = JSON.parse(
    await readFile(packageJsonPath, 'utf8'),
  );
  return listCiScripts(packageJson);
}

async function main(): Promise<void> {
  try {
    const scripts = await readCiScripts(process.argv[2]);
    process.stdout.write(`${scripts.join('\n')}\n`);
  } catch (error) {
    console.error(
      `Failed to discover CI scripts: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exitCode = 1;
  }
}

if (isMainModule(import.meta.url)) {
  await main();
}
