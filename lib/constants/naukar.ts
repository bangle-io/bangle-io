import { assertSafeZodSchema, z } from '@bangle.io/nsm-3';

export const openedFileSchema = assertSafeZodSchema(
  z.object({
    wsPath: z.string(),
    pendingWrite: z.boolean(),
    sha: z.union([z.string(), z.undefined()]),
    // the sha representing the sha currently on the disk. The faster this is updated, the faster
    // we can react to an external modification a file.
    currentDiskSha: z.union([z.string(), z.undefined()]),
    // The last sha our application wrote to the disk or read (if the file was not modified).
    // Comparing this to currentDiskSha will determine if the file was modified externally.
    lastKnownDiskSha: z.union([z.string(), z.undefined()]),
    currentDiskShaTimestamp: z.union([z.number(), z.undefined()]),
  }),
);

export type OpenedFile = z.infer<typeof openedFileSchema>;

export type NaukarReplicaWorkspaceState = z.infer<
  (typeof naukarReplicaWorkspaceSchema)['state']
>;

export const naukarReplicaWorkspaceSchema = {
  state: assertSafeZodSchema(
    z.object({
      wsName: z.string().optional(),
      openedFilesSha: z.record(openedFileSchema),
    }),
  ),

  updateFileShaEntry: assertSafeZodSchema(
    z.object({
      wsPath: z.string(),
      info: openedFileSchema.partial(),
    }),
  ),
};
