import type { SerialOperationNameType } from './extension-registry';

export interface NotificationPayloadType {
  uid: string;
  title: string;
  content?: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  buttons?: Array<{
    title: string;
    hint?: string;
    operation: SerialOperationNameType;
  }>;
}
