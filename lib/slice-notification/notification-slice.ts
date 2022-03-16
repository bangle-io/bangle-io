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
      value: { uid: string };
    }
  | {
      name: 'action::@bangle.io/slice-notification:CLEAR_ALL';
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
            const { uid } = action.value;
            if (state.notifications.some((n) => n.uid === uid)) {
              return {
                ...state,
                notifications: state.notifications.filter((n) => n.uid !== uid),
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

      'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION': (
        actionName,
      ) => {
        return notificationSliceKey.actionSerializer(
          actionName,
          (action) => ({
            uid: action.value.uid,
          }),
          (serialVal) => ({
            uid: serialVal.uid,
          }),
        );
      },
    },
  });
}
