import { z } from 'zod';

export const ALL_TOP_LEVEL_DIRS = ['app', 'js-lib', 'tooling', 'e2e-tests'];

export const bangleWorkspaceConfigSchema = z.object({
  allowedWorkspaces: z.array(z.string()),
});

export type BangleWorkspaceConfig = z.infer<typeof bangleWorkspaceConfigSchema>;
