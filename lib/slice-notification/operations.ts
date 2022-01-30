import { CORE_OPERATIONS_OPEN_GITHUB_ISSUE } from '@bangle.io/constants';
import type { NotificationPayloadType } from '@bangle.io/shared-types';
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
    let content: string =
      'Bangle.io encountered a problem. Please try reloading the app or report the issue.';

    if (error instanceof BaseError && error.displayMessage) {
      content += '\n' + error.displayMessage;
    } else {
      content += '\n' + error.message;
    }

    showNotification({
      severity: 'error',
      uid: `uncaughtExceptionNotification-` + error.name,
      buttons: [
        {
          title: 'Report issue',
          hint: `Report an issue on Github`,
          operation: CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
        },
      ],
      content:
        content +
        '\n' +
        `Stack Trace:
    ${error.stack}`,
    })(state, dispatch);
  });
}
