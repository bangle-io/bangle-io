import type { ActionNameType } from './extension-registry';

export interface NotificationPayloadType {
  uid: string;
  content: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  buttons?: Array<{ title: string; hint?: string; action: ActionNameType }>;
}
