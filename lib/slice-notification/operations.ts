import {
  CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
  Severity,
} from '@bangle.io/constants';
import type { NotificationPayloadType } from '@bangle.io/shared-types';
import { generateUid } from '@bangle.io/utils';

import type { EditorIssue } from './notification-slice';
import { notificationSliceKey } from './notification-slice';

export function getEditorIssue(wsPath: string) {
  return notificationSliceKey.queryOp((state) => {
    const { editorIssues } = notificationSliceKey.getSliceStateAsserted(state);

    return editorIssues.find((issue) => issue.wsPath === wsPath);
  });
}

export function setEditorIssue(value: Omit<EditorIssue, 'uid'>) {
  return notificationSliceKey.op((state, dispatch) => {
    const uid = generateUid();
    dispatch({
      name: 'action::@bangle.io/slice-notification:SET_EDITOR_ISSUE',
      value: {
        ...value,
        uid,
      },
    });

    return uid;
  });
}

export function clearEditorIssue(wsPath: string) {
  return notificationSliceKey.op((state, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/slice-notification:CLEAR_EDITOR_ISSUE',
      value: {
        wsPath: wsPath,
      },
    });
  });
}

export function showNotification(notification: NotificationPayloadType) {
  return notificationSliceKey.op((_, dispatch) => {
    if (notification.transient && !notification.createdAt) {
      notification.createdAt = Date.now();
    }
    dispatch({
      name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION',
      value: notification,
    });
  });
}

export function dismissNotification({
  uid,
}: {
  uid: NotificationPayloadType['uid'] | Array<NotificationPayloadType['uid']>;
}) {
  return notificationSliceKey.op((_, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION',
      value: {
        uids: Array.isArray(uid) ? uid : [uid],
      },
    });
  });
}

export function clearAllNotifications() {
  return notificationSliceKey.op((_, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/slice-notification:CLEAR_ALL_NOTIFICATIONS',
      value: {},
    });
  });
}

export function uncaughtExceptionNotification(error: Error) {
  return notificationSliceKey.op((state, dispatch) => {
    let content: string = 'Please try reloading the app or report the issue. ';

    content += error.name + ':' + error.message;

    showNotification({
      severity: Severity.ERROR,
      title: 'Bangle.io encountered a problem.',
      uid: `uncaughtExceptionNotification-` + error.name,
      buttons: [
        {
          title: 'Report issue',
          hint: `Report an issue on Github`,
          operation: CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
        },
      ],
      content: content,
    })(state, dispatch);
  });
}
