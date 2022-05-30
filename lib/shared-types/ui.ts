import type { SerialOperationNameType } from './extension-registry';

export interface NotificationPayloadType {
  uid: string;
  title: string;
  content?: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  // if notification needs to clear automatically
  transient?: boolean;
  // DO NOT use this field as it is internal
  createdAt?: number;
  buttons?: Array<{
    title: string;
    hint?: string;
    operation: SerialOperationNameType;
    // whether to dismiss the notification on clicking of the button
    dismissOnClick?: boolean;
  }>;
}
