import type { SerialOperationNameType } from './extension-registry';

export interface NotificationPayloadType {
  uid: string;
  title: string;
  content?: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  // if notification needs to clear automatically
  transient?: boolean;
  buttons?: Array<{
    title: string;
    hint?: string;
    operation: SerialOperationNameType;
  }>;
}
