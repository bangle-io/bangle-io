import type { ExtractActionValue } from '@bangle.io/create-store';
import { Slice, SliceKey } from '@bangle.io/create-store';
import type {
  NotificationPayloadType,
  SerialOperationNameType,
  Severity,
} from '@bangle.io/shared-types';
import { assertActionName } from '@bangle.io/utils';

export interface EditorIssue {
  title: string; // keep it short
  description: string;
  uid: string;
  wsPath: string;
  severity: Severity;
  serialOperation?: SerialOperationNameType;
  dismissOnPress?: boolean;
}

export type GetActionValue<R> = ExtractActionValue<NotificationAction, R>;

export type NotificationAction =
  | {
      name: 'action::@bangle.io/slice-notification:SET_EDITOR_ISSUE';
      value: EditorIssue;
    }
  | {
      name: 'action::@bangle.io/slice-notification:CLEAR_EDITOR_ISSUE';
      value: {
        wsPath: string;
      };
    }
  | {
      name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION';
      value: NotificationPayloadType;
    }
  | {
      name: 'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION';
      value: { uids: string[] };
    }
  | {
      name: 'action::@bangle.io/slice-notification:CLEAR_ALL_NOTIFICATIONS';
      value: {};
    };

export const notificationSliceKey = new SliceKey<
  {
    notifications: NotificationPayloadType[];
    editorIssues: EditorIssue[];
  },
  NotificationAction
>('notificationSliceKey');

export function notificationSlice() {
  assertActionName('@bangle.io/slice-notification', notificationSliceKey);

  return new Slice({
    key: notificationSliceKey,
    state: {
      init() {
        return {
          notifications: [],
          editorIssues: [],
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/slice-notification:CLEAR_EDITOR_ISSUE': {
            const { wsPath } = action.value;
            const { editorIssues } = state;

            if (!editorIssues.find((issue) => issue.wsPath === wsPath)) {
              return state;
            }

            return {
              ...state,
              editorIssues: editorIssues.filter(
                (issue) => issue.wsPath !== wsPath,
              ),
            };
          }

          case 'action::@bangle.io/slice-notification:SET_EDITOR_ISSUE': {
            const { editorIssues } = state;
            const { value: editorIssue } = action;

            const existing = editorIssues.find(
              (issue) => issue.wsPath === editorIssue.wsPath,
            );

            if (existing) {
              console.warn(
                `Overriding existing editor issue ${existing.severity}:${existing.title}`,
              );
            }

            const newIssues = editorIssues.filter(
              (issue) =>
                issue.uid !== editorIssue.uid &&
                issue.wsPath !== editorIssue.wsPath,
            );

            newIssues.push(editorIssue);

            return {
              ...state,
              editorIssues: newIssues,
            };
          }

          case 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION': {
            const { uid } = action.value;

            if (state.notifications.find((n) => n.uid === uid)) {
              // Prevent repeat firing of notifications
              return state;
            }

            return {
              ...state,
              notifications: [...state.notifications, action.value],
            };
          }

          case 'action::@bangle.io/slice-notification:CLEAR_ALL_NOTIFICATIONS': {
            return {
              ...state,
              notifications: [],
            };
          }

          case 'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION': {
            const { uids } = action.value;

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
          }

          default: {
            return state;
          }
        }
      },
    },
    actions: {
      'action::@bangle.io/slice-notification:SHOW_NOTIFICATION': (
        actionName,
      ) => {
        return notificationSliceKey.actionSerializer(
          actionName,
          (action) => ({
            content: action.value.content || null,
            buttons: action.value.buttons,
            uid: action.value.uid,
            severity: action.value.severity,
            title: action.value.title,
          }),
          (serialVal) => ({
            content: serialVal.content || undefined,
            buttons: serialVal.buttons,
            uid: serialVal.uid,
            severity: serialVal.severity,
            title: serialVal.title,
          }),
        );
      },

      'action::@bangle.io/slice-notification:CLEAR_EDITOR_ISSUE': (
        actionName,
      ) => {
        return notificationSliceKey.actionSerializer(
          actionName,
          (action) => ({
            wsPath: action.value.wsPath,
          }),
          (serialVal) => ({
            wsPath: serialVal.wsPath,
          }),
        );
      },

      'action::@bangle.io/slice-notification:SET_EDITOR_ISSUE': (
        actionName,
      ) => {
        return notificationSliceKey.actionSerializer(
          actionName,
          (action) => ({
            title: action.value.title,
            description: action.value.description ?? null,
            wsPath: action.value.wsPath,
            uid: action.value.uid,
            severity: action.value.severity,
            serialOperation: action.value.serialOperation ?? null,
            dismissOnPress: action.value.dismissOnPress,
          }),
          (serialVal) => ({
            title: serialVal.title,
            description: serialVal.description ?? undefined,
            wsPath: serialVal.wsPath,
            uid: serialVal.uid,
            severity: serialVal.severity,
            serialOperation: serialVal.serialOperation ?? undefined,
            dismissOnPress: serialVal.dismissOnPress,
          }),
        );
      },

      'action::@bangle.io/slice-notification:CLEAR_ALL_NOTIFICATIONS': (
        actionName,
      ) => {
        return notificationSliceKey.actionSerializer(
          actionName,
          (action) => ({}),
          (serialVal) => ({}),
        );
      },

      'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION': (
        actionName,
      ) => {
        return notificationSliceKey.actionSerializer(
          actionName,
          (action) => ({
            uids: action.value.uids,
          }),
          (serialVal) => ({
            uids: serialVal.uids,
          }),
        );
      },
    },
  });
}
