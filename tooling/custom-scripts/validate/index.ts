import { makeThrowValidationError } from '../lib';
import { Package, setup, Workspace } from '../lib/workspace-helper';

void setup().then(async (item) => {
  void shouldRespectAllowedWorkspace(item.packagesMap, item.workspaces);
  void shouldOnlyUseDependenciesDefinedInPackageJSON(item.packagesMap);
  void shouldOnlyUseDevDependenciesDefinedInPackageJSON(item.packagesMap);
  void testBrowserPackagesToNotRelyOnNode(item.packagesMap);
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
      await pkg.getImportedPackages((file) => file.isSrcFile)
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
