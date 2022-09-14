import { YarnWorkspaceHelpers } from '@bangle.io/yarn-workspace-helpers';

import { ROOT_DIR_PATH } from '../config';

const ws = new YarnWorkspaceHelpers({ rootDir: ROOT_DIR_PATH });

async function find() {
  const map = new Map<string, Set<string>>();
  await ws.forEachPackage(async (pkg) => {
    if (!pkg.location.includes('extensions/')) {
      return;
    }

    if (
      [
        '@bangle.io/shared-types',
        '@bangle.io/utils',
        '@bangle.io/test-utils',
        '@bangle.io/constants',
        '@bangle.io/e2e-types',
      ].includes(pkg.name)
    ) {
      return;
    }

    [...pkg.workspaceDependencies, ...pkg.workspaceDevDependencies].forEach(
      ([, dep]) => {
        if (
          [
            '@bangle.io/shared-types',
            '@bangle.io/utils',
            '@bangle.io/test-utils',
            '@bangle.io/constants',
            '@bangle.io/e2e-types',
          ].includes(dep.name)
        ) {
          return;
        }

        let existing = map.get(dep.name);

        if (!existing) {
          existing = new Set();
          map.set(dep.name, existing);
        }

        existing.add(pkg.name);
      },
    );
  });

  const mermaidList = [`digraph {`];
  for (const [name, deps] of map) {
    const sanitized = (r: string) => r.split('-').join('-');
    for (const dep of deps) {
      const connector = true ? '->' : '->';
      mermaidList.push(
        `    "${sanitized(name)}" ${connector} "${sanitized(dep)}"`,
      );
    }
  }

  mermaidList.push('}');
  console.log(mermaidList.join('\n'));
}

find();
