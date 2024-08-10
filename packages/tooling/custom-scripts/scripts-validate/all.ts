import { isMainModule, setup } from '../lib';
import { validate } from './validate';

// bun packages/tooling/custom-scripts/scripts-validate/all.ts
if (isMainModule(import.meta.url)) {
  void setup().then(async (item) => {
    await validate(item);
  });
}
