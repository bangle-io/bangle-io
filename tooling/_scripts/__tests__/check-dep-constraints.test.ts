import { PackageType } from '@bangle.io/yarn-workspace-helpers';

import { checkValidDependency } from '../check-dep-constraints';

const appPackage = { type: PackageType.app, name: 'some-app' };
const extPackage = { type: PackageType.extensions, name: 'some-ext' };
const jsLibPackage = { type: PackageType.jsLib, name: 'some-js-lib' };
const libPackage = { type: PackageType.lib, name: 'some-lib' };
const workerPackage = { type: PackageType.worker, name: 'some-worker' };
const toolingPackage = { type: PackageType.tooling, name: 'some-tool' };

describe('checkValidDependency jsLib', () => {
  test('jsLib self', () => {
    expect(
      checkValidDependency(jsLibPackage, {
        type: PackageType.jsLib,
        name: 'something-other-js-lib',
      }),
    ).toBe(true);
  });

  test('jsLib consumes extension', () => {
    expect(checkValidDependency(jsLibPackage, extPackage)).toBe(false);
  });

  test('jsLib consumes lib', () => {
    expect(checkValidDependency(jsLibPackage, libPackage)).toBe(false);
  });

  test('jsLib consumes app', () => {
    expect(checkValidDependency(jsLibPackage, appPackage)).toBe(false);
  });
});

describe('checkValidDependency app', () => {
  test('appPackage self', () => {
    expect(
      checkValidDependency(appPackage, {
        type: PackageType.app,
        name: 'something-other-app',
      }),
    ).toBe(true);
  });

  test('appPackage consumes extension', () => {
    expect(checkValidDependency(appPackage, extPackage)).toBe(true);
  });

  test('appPackage consumes jsLib', () => {
    expect(checkValidDependency(appPackage, jsLibPackage)).toBe(true);
  });

  test('appPackage consumes worker', () => {
    expect(checkValidDependency(appPackage, workerPackage)).toBe(true);
  });
  test('appPackage consumes tooling', () => {
    expect(checkValidDependency(appPackage, toolingPackage)).toBe(false);
  });
});

describe('checkValidDependency lib', () => {
  test('lib self', () => {
    expect(
      checkValidDependency(libPackage, {
        type: PackageType.lib,
        name: 'something-other-lib',
      }),
    ).toBe(true);
  });

  test('lib consumes extension', () => {
    expect(checkValidDependency(libPackage, extPackage)).toBe(false);
  });

  test('lib consumes jsLib', () => {
    expect(checkValidDependency(libPackage, jsLibPackage)).toBe(true);
  });

  test('lib consumes worker', () => {
    expect(checkValidDependency(libPackage, workerPackage)).toBe(false);
  });
  test('lib consumes tooling', () => {
    expect(checkValidDependency(libPackage, toolingPackage)).toBe(false);
  });
});

describe('checkValidDependency extension', () => {
  test('extension self', () => {
    expect(
      checkValidDependency(extPackage, {
        type: PackageType.extensions,
        name: 'something-other-ext',
      }),
    ).toBe(false);
  });

  test('extension consumes lib', () => {
    expect(checkValidDependency(extPackage, libPackage)).toBe(true);
  });

  test('extension consumes jsLib', () => {
    expect(checkValidDependency(extPackage, jsLibPackage)).toBe(true);
  });

  test('extension consumes worker', () => {
    expect(checkValidDependency(extPackage, workerPackage)).toBe(false);
  });
  test('extension consumes tooling', () => {
    expect(checkValidDependency(extPackage, toolingPackage)).toBe(false);
  });

  test('extension consumes @bangle.io/worker-naukar-proxy', () => {
    expect(
      checkValidDependency(extPackage, {
        type: PackageType.app,
        name: '@bangle.io/worker-naukar-proxy',
      }),
    ).toBe(true);
  });
});
