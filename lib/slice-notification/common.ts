import { SEVERITY } from '@bangle.io/constants';
import { z } from '@bangle.io/nsm-3';

export const EditorIssueSchema = z.object({
  title: z.string(),
  description: z.string(),
  uid: z.string(),
  wsPath: z.string(),
  severity: z.nativeEnum(SEVERITY),
  serialOperation: z.string().optional(),
  dismissOnPress: z.boolean().optional(),
});

export type EditorIssue = z.infer<typeof EditorIssueSchema>;
