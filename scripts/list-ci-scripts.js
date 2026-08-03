import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function listCiScripts(packageJson) {
  if (
    typeof packageJson !== 'object' ||
    packageJson === null ||
    Array.isArray(packageJson) ||
    typeof packageJson.scripts !== 'object' ||
    packageJson.scripts === null ||
    Array.isArray(packageJson.scripts)
  ) {
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

export async function readCiScripts(packageJsonPath = 'package.json') {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  return listCiScripts(packageJson);
}

async function main() {
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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
