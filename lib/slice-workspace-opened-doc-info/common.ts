import { SliceKey } from '@bangle.io/create-store';

export type WorkspaceOpenedDocInfoAction =
  | {
      name: 'action::@bangle.io/slice-workspace-opened-doc-info:update-apple';
      value: {
        apple: string;
      };
    }
  | {
      name: 'action::@bangle.io/slice-workspace-opened-doc-info:update-banana';
      value: {
        banana: number;
      };
    };

export const workspaceOpenedDocInfoKey = new SliceKey<
  {
    apple: string;
    banana: number;
  },
  WorkspaceOpenedDocInfoAction
>('@bangle.io/slice-workspace-opened-doc-info/slice-key');
