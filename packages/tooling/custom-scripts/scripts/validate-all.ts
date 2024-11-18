import { z } from 'zod';
import {
  BANGLE_IO_CONSTANTS_PKG_NAME,
  BANGLE_IO_SHARED_TYPES_PKG_NAME,
  banglePackageConfigSchema,
  serviceKindOrders,
} from '../config';
import {
  type SetupResult,
  isMainModule,
  makeLogger,
  makeThrowValidationError,
  setup,
} from '../lib';
import type { Package, Workspace } from '../lib';

// bun packages/tooling/custom-scripts/scripts/validate-all.ts
if (isMainModule(import.meta.url)) {
  void setup().then(async (item) => {
    await validate(item);
  });
}

export async function validate(item: SetupResult) {
  const logger = makeLogger('validate');
  const promises: Promise<any>[] = [
    shouldOnlyUseDependenciesDefinedInPackageJSON(item.packagesMap),
    shouldOnlyUseDevDependenciesDefinedInPackageJSON(item.packagesMap),
    shouldRespectAllowedWorkspace(item.packagesMap, item.workspaces),
    testBrowserPackagesToNotRelyOnNode(item.packagesMap),
    testJsUtilPackagesToOnlyRelyOnJsUtils(item.packagesMap),
    testSharedConstantsShouldNotHaveDeps(item.packagesMap),
    testUniversalPackagesToRelyOnlyOnUniversal(item.packagesMap),
    testServicePackagesDependencies(item.packagesMap),
  ];

  await Promise.all(promises);
  logger('Validation successful');
}

async function shouldRespectAllowedWorkspace(
  packageMap: Map<string, Package>,
  workspaceMap: Record<string, Workspace>,
) {
  const throwValidationError = makeThrowValidationError(
    'shouldRespectAllowedWorkspace',
  );

  for (const [name, pkg] of packageMap.entries()) {
    // shared-types is a special package that can be imported anywhere
    // to allow for circular dependencies, since it is just types.
    // this makes it convenient to rely on types without explicitly
    // depending on the corresponding JS code.
    if (name === BANGLE_IO_SHARED_TYPES_PKG_NAME) {
      continue;
    }

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
    ).filter((dep) => !dep.startsWith('node:') && !dep.startsWith('virtual:'));

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
    if (pkg.env !== 'browser') {
      continue;
    }

    const deps = Object.values(pkg.workspaceDependencies);

    for (const dep of deps) {
      if (dep.env === 'nodejs') {
        throwValidationError(
          `Browser Package ${name} ${pkg.packageJSONPath}
imports ${dep.name} which is a node package. Either move it to devDep or make it a browser package`,
        );
      }
    }
  }
}

async function testJsUtilPackagesToOnlyRelyOnJsUtils(
  packageMap: Map<string, Package>,
) {
  const throwValidationError = makeThrowValidationError(
    'testJsUtilPackagesToOnlyRelyOnJsUtils',
  );

  for (const [name, pkg] of packageMap.entries()) {
    if (pkg.banglePackageConfig.kind !== 'js-util') {
      continue;
    }

    const deps = [
      ...Object.values(pkg.workspaceDependencies),
      ...Object.values(pkg.workspaceDevDependencies),
    ];

    for (const dep of deps) {
      if (dep.banglePackageConfig.kind !== 'js-util') {
        throwValidationError(
          `Package  ${name} ${pkg.packageJSONPath} kind: ${pkg.banglePackageConfig.kind} imports "${dep.name}" which is a ${dep.banglePackageConfig.kind} package. 
          Js-util package can only import other js-util packages`,
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
    if (pkg.env !== 'universal') {
      continue;
    }

    const deps = Object.values(pkg.workspaceDependencies);

    for (const dep of deps) {
      if (dep.env !== 'universal') {
        throwValidationError(
          `Universal Package ${name} ${pkg.packageJSONPath}
imports ${dep.name} which is a ${dep.env} package. Universal package can only import other universal packages`,
        );
      }
    }
  }
}

async function testServicePackagesDependencies(
  packageMap: Map<string, Package>,
) {
  const throwValidationError = makeThrowValidationError(
    'testServicePackagesDependencies',
  );

  for (const [name, pkg] of packageMap.entries()) {
    if (!pkg.banglePackageConfig.kind.startsWith('service-')) {
      continue;
    }

    const pkgKind = pkg.banglePackageConfig.kind;
    const pkgKindIndex = serviceKindOrders.indexOf(pkgKind);

    if (pkgKindIndex === -1) {
      throwValidationError(
        `Package ${name} has unknown service kind ${pkgKind}`,
      );
      continue;
    }

    const allowedKinds = serviceKindOrders.slice(0, pkgKindIndex + 1);

    const deps = [
      ...Object.values(pkg.workspaceDependencies),
      ...Object.values(pkg.workspaceDevDependencies),
    ];

    for (const dep of deps) {
      if (dep.banglePackageConfig.kind.startsWith('service-')) {
        const depKind = dep.banglePackageConfig.kind;

        if (!allowedKinds.includes(depKind)) {
          throwValidationError(
            `Package ${name} of kind ${pkgKind} cannot depend on ${dep.name} of kind ${depKind}`,
          );
        }
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
    if (pkg.name !== BANGLE_IO_CONSTANTS_PKG_NAME) {
      continue;
    }

    visited = true;
    const deps = Object.keys(pkg.dependencies);

    const [firstPackage, ...rest] = deps;

    if (
      rest.length > 0 ||
      (firstPackage && firstPackage !== BANGLE_IO_SHARED_TYPES_PKG_NAME) ||
      Object.keys(pkg.devDependencies ?? {}).length > 0
    ) {
      throwValidationError(
        `Package "${name}" $pkg.packageJSONPathcan only depend on one package $BANGLE_IO_SHARED_TYPES_PKG_NAME.`,
      );
    }
  }

  if (!visited) {
    throwValidationError(
      `Package "${BANGLE_IO_CONSTANTS_PKG_NAME}" is not present in the workspace`,
    );
  }
}
