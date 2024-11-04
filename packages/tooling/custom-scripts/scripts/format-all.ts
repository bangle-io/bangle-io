import { isMainModule, setup } from '../lib';
import { formatPackageJSON } from './format-package-json';

// bun packages/tooling/custom-scripts/scripts/format-all.ts
if (isMainModule(import.meta.url)) {
  void setup({ validatePackageConfig: false }).then(async (item) => {
    await formatPackageJSON(item);
  });
}
