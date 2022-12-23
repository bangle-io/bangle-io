import React from 'react';

import { notification, useSerialOperationContext } from '@bangle.io/api';
import { useSliceState } from '@bangle.io/bangle-store-context';
import { SEVERITY } from '@bangle.io/constants';
import type { NotificationPayloadType } from '@bangle.io/shared-types';
import {
  dismissNotification,
  notificationSliceKey,
} from '@bangle.io/slice-notification';
import {
  ButtonV2,
  ButtonVariant,
  CheckCircleIcon,
  CloseIcon,
  ExclamationCircleIcon,
  ExclamationIcon,
  InformationCircleIcon,
  TextButton,
} from '@bangle.io/ui-components';
import { useInterval } from '@bangle.io/utils';

const CLEAR_INTERVAL = 8000;

export function NotificationArea() {
  const {
    store,
    sliceState: { notifications },
  } = useSliceState(notificationSliceKey);

  useInterval(
    () => {
      let currentTime = Date.now();
      let toRemove = notifications
        .filter((n) => {
          return (
            n.transient &&
            n.createdAt &&
            CLEAR_INTERVAL < currentTime - n.createdAt
          );
        })
        .map((n) => {
          return n.uid;
        });

      if (toRemove.length > 0) {
        notification.dismissNotification({ uid: toRemove })(
          store.state,
          store.dispatch,
        );
      }
    },
    [notifications, store],
    2000,
  );

  return (
    <div className="fixed bottom-0 right-0 z-50">
      {notifications.map((n) => (
        <Notification
          key={n.uid}
          onDismiss={() => {
            dismissNotification({ uid: n.uid })(store.state, store.dispatch);
          }}
          title={n.title}
          content={n.content?.split('\n').map((r, i) => (
            <span key={i}>{r}</span>
          ))}
          severity={n.severity}
          buttons={n.buttons}
        />
      ))}
    </div>
  );
}

const SeverityMap: Record<
  Exclude<NotificationPayloadType['severity'], undefined>,
  () => React.ReactNode
> = {
  error: () => (
    <ExclamationCircleIcon className="w-6 h-6 color-colorCriticalBtn" />
  ),
  warning: () => <ExclamationIcon className="w-6 h-6 color-colorCautionBtn" />,
  info: () => (
    <InformationCircleIcon style={{ color: 'var(--BV-severity-info-color)' }} />
  ),
  success: () => (
    <CheckCircleIcon style={{ color: 'var(--BV-severity-success-color)' }} />
  ),
};

export function Notification({
  content = '',
  title,
  buttons,
  severity = SEVERITY.INFO,
  onDismiss,
}: {
  title?: string;
  content: React.ReactNode;
  severity?: NotificationPayloadType['severity'];
  buttons?: NotificationPayloadType['buttons'];
  onDismiss: () => void;
}) {
  const { dispatchSerialOperation } = useSerialOperationContext();

  return (
    <div
      data-testid="app-entry_notification"
      className="bg-colorBgLayerFloat w-96 relative p-2 mx-4 my-4 transition duration-100 ease-in-out shadow-xl rounded shadow-lg border border-1 border-colorNeutralBorder"
    >
      <div className="flex flex-col w-full">
        <div className="flex flex-row">
          <div className="mr-2">{SeverityMap[severity]()}</div>
          <div className="flex-grow">{title}</div>
          <div>
            <ButtonV2
              size="xs"
              variant={ButtonVariant.Transparent}
              ariaLabel="dismiss notification"
              leftIcon={<CloseIcon />}
              onPress={() => {
                onDismiss();
              }}
            />
          </div>
        </div>
        <div className="w-full text-sm flex flex-col">
          {typeof content === 'string' ? <span>{content}</span> : content}
        </div>
      </div>
      <div className="flex flex-row-reverse w-full mt-3">
        {buttons &&
          buttons.map((b, i) => (
            <TextButton
              key={i}
              hintPos="left"
              className="ml-3"
              onClick={async () => {
                if (b.dismissOnClick) {
                  onDismiss();
                }
                dispatchSerialOperation({ name: b.operation });
              }}
              hint={b.hint}
            >
              {b.title}
            </TextButton>
          ))}
      </div>
    </div>
  );
}
