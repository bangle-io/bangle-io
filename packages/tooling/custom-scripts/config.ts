import path from 'node:path';
import { z } from 'zod';

export const rootPath = path.resolve(__dirname, '../../..');
export const ROOT_PKG_NAME = 'bangle-io';
export const BANGLE_IO_CONSTANTS_PKG_NAME = '@bangle.io/constants';
export const BANGLE_IO_SHARED_TYPES_PKG_NAME = '@bangle.io/types';
export const VITEST_PKG_NAME = 'vitest';

export const PACKAGE_JSON_DEFAULTS = {
  license: 'AGPL-3.0-or-later',
  repository: {
    type: 'git',
    url: 'https://github.com/bangle-io/bangle-io.git',
  },
  authors: [
    {
      name: 'Kushan Joshi',
      email: '0o3ko0@gmail.com',
      web: 'http://github.com/kepta',
    },
  ],
  homepage: 'https://bangle.io',
  bugs: {
    url: 'https://github.com/bangle-io/bangle-io/issues',
  },
  banglePackageConfig: {
    env: 'universal',
    kind: 'library',
  } satisfies BanglePackageConfig,
};

export const bangleWorkspaceConfigSchema = z.object({
  // The packages in workspaces (the folders in packages dir) that are allowed to be dependent on
  allowedWorkspaces: z.array(z.string()),
});

export const banglePackageConfigSchema = z.object({
  env: z.enum(['nodejs', 'browser', 'universal']),
  kind: z.enum([
    'library',
    'js-util',
    // all things that are static and have limited dep: configs, constants
    'static',
    'types',
    'build',
    'app',
    'service-platform',
    'service-core',
    'service-ui',
  ]),
  skipValidation: z.boolean().optional(),
});

// defines the order in which the services should be depended on
// for example. first service-platform cannot anything after it.
// service-core can depend on itself and service-platform
export const serviceKindOrders = [
  'service-platform',
  'service-core',
  'service-ui',
];

export type BangleWorkspaceConfig = z.infer<typeof bangleWorkspaceConfigSchema>;
export type BanglePackageConfig = z.infer<typeof banglePackageConfigSchema>;
