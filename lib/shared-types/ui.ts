import type { SerialOperationNameType } from './extension-registry';

export interface NotificationPayloadType {
  uid: string;
  content: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  buttons?: Array<{
    title: string;
    hint?: string;
    operation: SerialOperationNameType;
  }>;
}
