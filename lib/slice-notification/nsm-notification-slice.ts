import { slice } from '@bangle.io/nsm-3';
import type { NotificationPayloadType, WsPath } from '@bangle.io/shared-types';

import type { EditorIssue } from './common';

const notificationSliceInitState: {
  notifications: NotificationPayloadType[];
  editorIssues: EditorIssue[];
} = {
  notifications: [],
  editorIssues: [],
};

export const nsmNotificationSlice = slice([], {
  name: 'notificationSliceKey',
  state: notificationSliceInitState,
});

export const setEditorIssue = nsmNotificationSlice.action(
  function setEditorIssue(editorIssue: EditorIssue) {
    return nsmNotificationSlice.tx((state) => {
      return nsmNotificationSlice.update(state, (sliceState) => {
        const { editorIssues } = sliceState;

        const newIssues = editorIssues.filter(
          (issue) =>
            issue.uid !== editorIssue.uid &&
            issue.wsPath !== editorIssue.wsPath,
        );

        newIssues.push(editorIssue);

        return { editorIssues: newIssues };
      });
    });
  },
);

export const clearEditorIssue = nsmNotificationSlice.action(
  function clearEditorIssue(uid: string) {
    return nsmNotificationSlice.tx((state) => {
      return nsmNotificationSlice.update(state, (sliceState) => {
        const { editorIssues } = sliceState;

        if (!editorIssues.find((issue) => issue.uid === uid)) {
          return sliceState;
        }

        return {
          editorIssues: editorIssues.filter((issue) => issue.uid !== uid),
        };
      });
    });
  },
);

export const showNotification = nsmNotificationSlice.action(
  function showNotification(notification: NotificationPayloadType) {
    return nsmNotificationSlice.tx((state) => {
      return nsmNotificationSlice.update(state, (sliceState) => {
        const { uid } = notification;

        if (sliceState.notifications.find((n) => n.uid === uid)) {
          // Prevent repeat firing of notifications
          return sliceState;
        }

        return {
          notifications: [...sliceState.notifications, notification],
        };
      });
    });
  },
);

export const clearAllNotifications = nsmNotificationSlice.action(
  function clearAllNotifications() {
    return nsmNotificationSlice.tx((state) => {
      return nsmNotificationSlice.update(state, {
        notifications: [],
      });
    });
  },
);

export const dismissNotification = nsmNotificationSlice.action(
  function dismissNotification(uids: string[] | string) {
    return nsmNotificationSlice.tx((state) => {
      return nsmNotificationSlice.update(state, (sliceState) => {
        const newNotifications = sliceState.notifications.filter((n) => {
          return !uids.includes(n.uid);
        });

        if (newNotifications.length !== sliceState.notifications.length) {
          return {
            notifications: newNotifications,
          };
        }

        return sliceState;
      });
    });
  },
);

export const getEditorIssue = nsmNotificationSlice.query((wsPath: WsPath) => {
  return (state): EditorIssue | undefined => {
    const { editorIssues } = nsmNotificationSlice.get(state);

    return editorIssues.find((issue) => issue.wsPath === wsPath);
  };
});
