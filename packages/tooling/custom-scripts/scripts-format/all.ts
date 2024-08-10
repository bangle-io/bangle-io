import { isMainModule, setup } from '../lib';
import { formatPackageJSON } from './format-package-json';

// bun packages/tooling/custom-scripts/scripts-readonly/all.ts
if (isMainModule(import.meta.url)) {
  void setup().then(async (item) => {
    await formatPackageJSON(item);
  });
}
