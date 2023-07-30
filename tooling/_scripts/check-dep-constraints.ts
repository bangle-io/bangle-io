import {
  PackageType,
  YarnWorkspaceHelpers,
} from '@bangle.io/yarn-workspace-helpers';

import { ROOT_DIR_PATH } from './config';

const IGNORE_PACKAGES = ['@bangle.io/e2e-types', '@bangle.io/test-utils-2'];

export async function checkDepConstraints(
  ws = new YarnWorkspaceHelpers({ rootDir: ROOT_DIR_PATH }),
) {
  for (const pkg of ws.packageIterator({ ignoreWorkTree: true })) {
    const pkgType = pkg.type;
    const constraints = depTypeConstraints[pkgType];

    if (!constraints) {
      throw new Error(`No constraints defined for package type ${pkgType}`);
    }

    for (const [dep, depPkg] of [
      ...pkg.workspaceDependencies,
      ...pkg.workspaceDevDependencies,
    ]) {
      if (!checkValidDependency(pkg, depPkg)) {
        throw new Error(`Dependency ${dep} in package ${
          pkg.name
        } is not allowed.
Allowed dependencies are: \n${printConstraints(constraints)}`);
      }
    }
  }

  console.log('checkDepConstraints: no issues found');
}

enum MatchKind {
  packageType = 'PACKAGE_TYPE',
  packageName = 'PACKAGE_NAME',
  any = 'ANY',
}

const MATCH_ANY = [{ kind: MatchKind.any } as const];

type MatchType =
  | {
      kind: MatchKind.packageType;
      value: PackageType;
    }
  | {
      kind: MatchKind.packageName;
      value: string;
    }
  | {
      kind: MatchKind.any;
    };

const JS_LIB: MatchType = {
  kind: MatchKind.packageType,
  value: PackageType.jsLib,
};

const LIB: MatchType = { kind: MatchKind.packageType, value: PackageType.lib };

const WORKER: MatchType = {
  kind: MatchKind.packageType,
  value: PackageType.worker,
};

const EXTENSIONS: MatchType = {
  kind: MatchKind.packageType,
  value: PackageType.extensions,
};

const APP: MatchType = { kind: MatchKind.packageType, value: PackageType.app };

const depTypeConstraints: Record<PackageType, MatchType[]> = {
  [PackageType.app]: [APP, EXTENSIONS, JS_LIB, LIB, WORKER],
  [PackageType.extensions]: [
    JS_LIB,
    LIB,
    { kind: MatchKind.packageName, value: '@bangle.io/worker-naukar-proxy' }, // TODO lets move this away to bangle.io/api, the blocker is that bangle.io/api is in lib folder
  ],
  [PackageType.jsLib]: [JS_LIB],
  [PackageType.lib]: [JS_LIB, LIB],
  [PackageType.tooling]: MATCH_ANY,
  [PackageType.worker]: [JS_LIB, LIB, WORKER],
  [PackageType.root]: MATCH_ANY,
};

function printConstraints(constraint: MatchType[]) {
  return constraint
    .map((c) => {
      switch (c.kind) {
        case MatchKind.packageType:
          return `packageType = "${c.value}"`;
        case MatchKind.packageName:
          return `packageName: "${c.value}"`;
        case MatchKind.any:
          return 'ANY';
      }
    })
    .join(' or \n');
}

export function checkValidDependency(
  pkg: {
    name: string;
    type: PackageType;
  },
  depPkg: {
    name: string;
    type: PackageType;
  },
  _ignorePkgs = IGNORE_PACKAGES,
) {
  if (_ignorePkgs.includes(pkg.name)) {
    return true;
  }
  const constraints = depTypeConstraints[pkg.type];

  if (!constraints) {
    throw new Error(`No constraints defined for package type ${pkg.type}`);
  }

  return constraints.some((constraint) => {
    switch (constraint.kind) {
      case MatchKind.packageType:
        return depPkg.type === constraint.value;
      case MatchKind.packageName:
        return depPkg.name === constraint.value;
      case MatchKind.any:
        return true;
    }
  });
}
