import { YarnWorkspaceHelpers } from '@bangle.io/yarn-workspace-helpers';

import { checkDepConstraints } from './check-dep-constraints';
import { checkMultipleInstances } from './check-multiple-instances';
import { ROOT_DIR_PATH } from './config';
import { generateStyleLintRegex } from './generate-stylelint-regex';

if (require.main === module) {
  const ws = new YarnWorkspaceHelpers({ rootDir: ROOT_DIR_PATH });

  checkMultipleInstances();
  checkDepConstraints(ws);
  generateStyleLintRegex(ws);

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}
