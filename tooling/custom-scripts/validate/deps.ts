import { Package, setup } from '../lib/workspace-helper';

function throwValidationError(message: string): never {
  throw new Error(message);
}

void setup().then(async (item) => {
  await shouldOnlyUseDependenciesDefinedInPackageJSON(item.packagesMap);
  await shouldOnlyUseDevDependenciesDefinedInPackageJSON(item.packagesMap);
});

async function shouldOnlyUseDependenciesDefinedInPackageJSON(
  packageMap: Map<string, Package>,
) {
  for (const [name, pkg] of packageMap.entries()) {
    const deps = (
      await pkg.getImportedPackages((file) => file.isSrcFile)
    ).filter((dep) => !dep.startsWith('node:'));

    for (const dep of deps) {
      if (!pkg.dependencies[dep]) {
        throwValidationError(
          `Package ${name} ${pkg.packageJSONPath}  imports ${dep} which is not in the workspace`,
        );
      }
    }
  }
}

async function shouldOnlyUseDevDependenciesDefinedInPackageJSON(
  packageMap: Map<string, Package>,
) {
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
