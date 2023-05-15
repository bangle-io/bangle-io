import { NotificationPayloadSchema } from '@bangle.io/constants';
import {
  createQueryState,
  createSliceV2,
  serialAction,
  z,
} from '@bangle.io/nsm';
import type { NotificationPayloadType, WsPath } from '@bangle.io/shared-types';

import type { EditorIssue } from './common';
import { EditorIssueSchema } from './common';

const notificationSliceInitState: {
  notifications: NotificationPayloadType[];
  editorIssues: EditorIssue[];
} = {
  notifications: [],
  editorIssues: [],
};

export const nsmNotificationSlice = createSliceV2([], {
  name: 'notificationSliceKey',
  initState: notificationSliceInitState,
});

export const setEditorIssue = nsmNotificationSlice.createAction(
  'setEditorIssue',
  serialAction(EditorIssueSchema, (editorIssue) => {
    return (state) => {
      const { editorIssues } = state;

      const newIssues = editorIssues.filter(
        (issue) =>
          issue.uid !== editorIssue.uid && issue.wsPath !== editorIssue.wsPath,
      );

      newIssues.push(editorIssue);

      return {
        ...state,
        editorIssues: newIssues,
      };
    };
  }),
);

export const clearEditorIssue = nsmNotificationSlice.createAction(
  'clearEditorIssue',
  serialAction(z.string(), (uid) => {
    return (state) => {
      const { editorIssues } = state;

      if (!editorIssues.find((issue) => issue.uid === uid)) {
        return state;
      }

      return {
        ...state,
        editorIssues: editorIssues.filter((issue) => issue.uid !== uid),
      };
    };
  }),
);

export const showNotification = nsmNotificationSlice.createAction(
  'showNotification',
  serialAction(NotificationPayloadSchema, (notification) => {
    return (state) => {
      const { uid } = notification;

      if (state.notifications.find((n) => n.uid === uid)) {
        // Prevent repeat firing of notifications
        return state;
      }

      return {
        ...state,
        notifications: [...state.notifications, notification],
      };
    };
  }),
);

export const clearAllNotifications = nsmNotificationSlice.createAction(
  'clearAllNotifications',
  serialAction(z.undefined(), () => {
    return (state) => {
      return {
        ...state,
        notifications: [],
      };
    };
  }),
);

export const dismissNotification = nsmNotificationSlice.createAction(
  'dismissNotification',
  serialAction(z.union([z.string(), z.array(z.string())]), (uids) => {
    return (state) => {
      let newNotifications = state.notifications.filter((n) => {
        return !uids.includes(n.uid);
      });

      if (newNotifications.length !== state.notifications.length) {
        return {
          ...state,
          notifications: newNotifications,
        };
      }

      return state;
    };
  }),
);

export const getEditorIssue = createQueryState(
  [nsmNotificationSlice],
  (state, wsPath: WsPath) => {
    const { editorIssues } = nsmNotificationSlice.getState(state);

    return editorIssues.find((issue) => issue.wsPath === wsPath);
  },
);
