import { makeLogger, makeThrowValidationError } from '../lib';
import { Package, setup, Workspace } from '../lib/workspace-helper';
void setup().then(async (item) => {
  const logger = makeLogger('validate');
  let promises: Promise<any>[] = [];
  promises.push(
    shouldRespectAllowedWorkspace(item.packagesMap, item.workspaces),
  );
  promises.push(
    shouldOnlyUseDependenciesDefinedInPackageJSON(item.packagesMap),
  );
  promises.push(
    shouldOnlyUseDevDependenciesDefinedInPackageJSON(item.packagesMap),
  );
  promises.push(testBrowserPackagesToNotRelyOnNode(item.packagesMap));
  promises.push(testUniversalPackagesToRelyOnlyOnUniversal(item.packagesMap));
  promises.push(testSharedConstantsShouldNotHaveDeps(item.packagesMap));

  await Promise.all(promises);
  logger('Validation successful');
});

async function shouldRespectAllowedWorkspace(
  packageMap: Map<string, Package>,
  workspaceMap: Record<string, Workspace>,
) {
  const throwValidationError = makeThrowValidationError(
    'shouldRespectAllowedWorkspace',
  );

  for (const [name, pkg] of packageMap.entries()) {
    let deps = Object.keys(pkg.workspaceDependencies);
    deps.push(...Object.keys(pkg.workspaceDevDependencies));

    deps = [...new Set(deps)];

    for (const dep of deps) {
      const result = pkg.workspace.allowedWsDependency(
        [...Object.values(workspaceMap)],
        dep,
      );

      if (!result) {
        throwValidationError(
          `Package ${name} imports ${dep}  
          which is not allowed in the workspace. 
          Check "allowedWorkspaces" in the package.json of workspace of ${pkg.workspace.path}`,
        );
      }
    }
  }
}

async function shouldOnlyUseDependenciesDefinedInPackageJSON(
  packageMap: Map<string, Package>,
) {
  const throwValidationError = makeThrowValidationError(
    'shouldOnlyUseDependenciesDefinedInPackageJSON',
  );
  for (const [name, pkg] of packageMap.entries()) {
    const deps = (
      await pkg.getImportedPackages((file) => file.isTsSrcFile)
    ).filter((dep) => !dep.startsWith('node:'));

    for (const dep of deps) {
      if (!pkg.dependencies[dep]) {
        throwValidationError(
          `Error in Package ${name}
${pkg.packageJSONPath}

imports dependency: ${dep} which is not defined in package.json's "dependencies"`,
        );
      }
    }
  }
}

async function shouldOnlyUseDevDependenciesDefinedInPackageJSON(
  packageMap: Map<string, Package>,
) {
  const throwValidationError = makeThrowValidationError(
    'shouldOnlyUseDevDependenciesDefinedInPackageJSON',
  );

  for (const [name, pkg] of packageMap.entries()) {
    const deps = (
      await pkg.getImportedPackages((file) => file.isTestFile)
    ).filter((dep) => !dep.startsWith('node:'));

    for (const dep of deps) {
      if (!pkg.devDependencies?.[dep] && !pkg.dependencies[dep]) {
        throwValidationError(
          `Package ${name} ${pkg.packageJSONPath}  imports ${dep} which is not in the workspace`,
        );
      }
    }
  }
}

async function testBrowserPackagesToNotRelyOnNode(
  packageMap: Map<string, Package>,
) {
  const throwValidationError = makeThrowValidationError(
    'testBrowserPackagesToNotRelyOnNode',
  );

  for (const [name, pkg] of packageMap.entries()) {
    if (pkg.type !== 'browser') {
      continue;
    }

    const deps = Object.values(pkg.workspaceDependencies);

    for (const dep of deps) {
      if (dep.type === 'nodejs') {
        throwValidationError(
          `Browser Package ${name} ${pkg.packageJSONPath}
imports ${dep.name} which is a node package. Either move it to devDep or make it a browser package`,
        );
      }
    }
  }
}

async function testUniversalPackagesToRelyOnlyOnUniversal(
  packageMap: Map<string, Package>,
) {
  const throwValidationError = makeThrowValidationError(
    'testUniversalPackagesToRelyOnlyOnUniversal',
  );

  for (const [name, pkg] of packageMap.entries()) {
    if (pkg.type !== 'universal') {
      continue;
    }

    const deps = Object.values(pkg.workspaceDependencies);

    for (const dep of deps) {
      if (dep.type !== 'universal') {
        throwValidationError(
          `Universal Package ${name} ${pkg.packageJSONPath}
imports ${dep.name} which is a ${dep.type} package. Universal package can only import other universal packages`,
        );
      }
    }
  }
}

/**
 * Ensure constants package does not have any dependencies,
 * having dependencies in constants package will end up causing extra code
 * to be bundled in the inlined scripts.
 * Keeping constants lean helps us use it at multiple places.
 */
async function testSharedConstantsShouldNotHaveDeps(
  packageMap: Map<string, Package>,
) {
  const throwValidationError = makeThrowValidationError(
    'testSharedConstantsShouldNotHaveDeps',
  );

  let visited = false;
  for (const [name, pkg] of packageMap.entries()) {
    if (pkg.name !== '@bangle.io/constants') {
      continue;
    }

    visited = true;
    const deps = Object.keys(pkg.dependencies);

    const [firstPackage, ...rest] = deps;

    if (
      rest.length > 0 ||
      firstPackage !== '@bangle.io/shared-types' ||
      Object.keys(pkg.devDependencies ?? {}).length > 0
    ) {
      throwValidationError(
        `Package "${name}" ${pkg.packageJSONPath} can only depend on one package @bangle-io/shared-types.`,
      );
    }
  }

  if (!visited) {
    throwValidationError(
      `Package "@bangle.io/constants" is not present in the workspace`,
    );
  }
}
