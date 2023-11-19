import path from 'node:path';
import { z } from 'zod';

export const rootPath = path.resolve(__dirname, '../../../..');

export const bangleWorkspaceConfigSchema = z.object({
  // The packages in workspaces (the folders in packages dir) that are allowed to be dependent on
  allowedWorkspaces: z.array(z.string()),
});

export const banglePackageConfigSchema = z.object({
  type: z.enum(['nodejs', 'browser', 'universal']),
});

export type BangleWorkspaceConfig = z.infer<typeof bangleWorkspaceConfigSchema>;
export type BanglePackageConfig = z.infer<typeof banglePackageConfigSchema>;
