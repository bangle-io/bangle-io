import { z } from 'zod';

export const ALL_TOP_LEVEL_DIRS = ['app', 'js-lib', 'tooling', 'e2e-tests'];

export const bangleWorkspaceConfigSchema = z.object({});

export type BangleWorkspaceConfig = z.infer<typeof bangleWorkspaceConfigSchema>;
