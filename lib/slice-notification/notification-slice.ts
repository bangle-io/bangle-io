import { Slice, SliceKey } from '@bangle.io/create-store';
import type { NotificationPayloadType } from '@bangle.io/shared-types';
import { assertActionName } from '@bangle.io/utils';

export const notificationSliceKey = new SliceKey<
  {
    notifications: NotificationPayloadType[];
  },
  | {
      name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION';
      value: NotificationPayloadType;
    }
  | {
      name: 'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION';
      value: { uids: string[] };
    }
  | {
      name: 'action::@bangle.io/slice-notification:CLEAR_ALL';
      value: {};
    }
>('notificationSliceKey');

export function notificationSlice() {
  assertActionName('@bangle.io/slice-notification', notificationSliceKey);

  return new Slice({
    key: notificationSliceKey,
    state: {
      init() {
        return { notifications: [] };
      },
      apply(action, state) {
        switch (action.name) {
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

          case 'action::@bangle.io/slice-notification:CLEAR_ALL': {
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

      'action::@bangle.io/slice-notification:CLEAR_ALL': (actionName) => {
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
