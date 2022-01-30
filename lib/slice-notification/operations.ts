import { NotificationPayloadType } from '@bangle.io/shared-types';
import { BaseError } from '@bangle.io/utils';
import { notificationSliceKey } from './notification-slice';

export function showNotification(notification: NotificationPayloadType) {
  return notificationSliceKey.op((_, disptach) => {
    disptach({
      name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION',
      value: notification,
    });
  });
}

export function dismissNotification({
  uid,
}: {
  uid: NotificationPayloadType['uid'];
}) {
  return notificationSliceKey.op((_, disptach) => {
    disptach({
      name: 'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION',
      value: {
        uid,
      },
    });
  });
}

export function uncaughtExceptionNotification(error: Error) {
  return notificationSliceKey.op((state, dispatch) => {
    let content: string = '';
    if (error instanceof BaseError && error.displayMessage) {
      content = error.displayMessage;
    } else {
      content = error.message;
    }

    const notification = {
      uid: `uncaughtExceptionNotification-` + error.name,
      content: `${content}
    
    Stack Trace:
    ${error.stack}`,
    };

    showNotification(notification)(state, dispatch);
  });
}
