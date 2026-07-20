import { makeLogger, setup } from '../lib';
import { addWorkspaceDep } from './add-workspace-dep';
import { formatPackageJSON } from './format-package-json';
import { removeUnusedAllDeps, removeUnusedDeps } from './remove-unused-deps';
import { validate } from './validate-all';

const logger = makeLogger('maintenanceAll');

/**
 * Runs a comprehensive maintenance workflow for the entire workspace.
 * This script combines multiple maintenance operations in the optimal order:
 * 1. Add missing workspace dependencies
 * 2. Remove unused dependencies
 * 3. Format package.json files
 * 4. Validate workspace structure and dependencies
 *
 * Usage: bun packages/tooling/custom-scripts/scripts/maintenance-all.ts
 */
async function main() {
  logger('Starting comprehensive workspace maintenance...');

  const setupResult = await setup({ validatePackageConfig: false });

  try {
    // 1. Add missing workspace dependencies first
    logger('Step 1: Adding missing workspace dependencies...');
    await addWorkspaceDep(setupResult);

    // 2. Remove unused dependencies
    logger('Step 2: Removing unused dependencies...');
    await removeUnusedDeps(setupResult);
    await removeUnusedAllDeps(setupResult);

    // 3. Format package.json files
    logger('Step 3: Formatting package.json files...');
    await formatPackageJSON(setupResult);

    // 4. Validate everything is correct
    logger('Step 4: Validating workspace...');
    await validate(setupResult);

    logger('✅ Comprehensive workspace maintenance completed successfully!');
  } catch (error) {
    logger('❌ Maintenance failed:', error);
    process.exit(1);
  }
}

void main();
