import React from 'react';

import { useSerialOperationContext } from '@bangle.io/serial-operation-context';
import type { NotificationPayloadType } from '@bangle.io/shared-types';
import {
  ButtonIcon,
  CheckCircleIcon,
  CloseIcon,
  ExclamationCircleIcon,
  ExclamationIcon,
  InformationCircleIcon,
  TextButton,
} from '@bangle.io/ui-components';
import { useSliceState } from '@bangle.io/bangle-store-context';
import { notificationSliceKey } from '@bangle.io/slice-notification';
import { dismissNotification } from '@bangle.io/slice-notification/operations';

export function NotificationArea({}) {
  const {
    store,
    sliceState: { notifications },
  } = useSliceState(notificationSliceKey);
  return (
    <div className="fixed bottom-0 right-0 z-50">
      {notifications.map((n) => (
        <Notification
          key={n.uid}
          onDismiss={() => {
            dismissNotification({ uid: n.uid })(store.state, store.dispatch);
          }}
          content={n.content}
          severity={n.severity}
          buttons={n.buttons}
        />
      ))}
    </div>
  );
}

const Severity: Record<
  Exclude<NotificationPayloadType['severity'], undefined>,
  () => React.ReactNode
> = {
  error: () => (
    <ExclamationCircleIcon style={{ color: 'var(--severity-error-color)' }} />
  ),
  warning: () => (
    <ExclamationIcon style={{ color: 'var(--severity-warning-color)' }} />
  ),
  info: () => (
    <InformationCircleIcon style={{ color: 'var(--severity-info-color)' }} />
  ),
  success: () => (
    <CheckCircleIcon style={{ color: 'var(--severity-success-color)' }} />
  ),
};

export function Notification({
  content = '',
  buttons,
  severity = 'info',
  onDismiss,
}: {
  content: React.ReactNode;
  severity?: NotificationPayloadType['severity'];
  buttons?: NotificationPayloadType['buttons'];
  onDismiss: () => void;
}) {
  const { dispatchSerialOperation } = useSerialOperationContext();

  return (
    <div
      className="app-entry_notification w-96 relative p-2 mx-4 my-4 transition duration-100 ease-in-out shadow"
      style={{
        backgroundColor: 'var(--window-bgColor-1)',
        boxShadow: '0px 0px 4px 2px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div className=" flex flex-row w-full">
        <span className="mr-2">{Severity[severity]()}</span>
        <div className="w-full text-sm">
          {typeof content === 'string' ? <span>{content}</span> : content}
        </div>
        <div>
          <ButtonIcon
            hint="dismiss"
            hintPos="left"
            onClick={async (e) => {
              onDismiss();
            }}
          >
            <CloseIcon style={{ height: 16, width: 16 }} />
          </ButtonIcon>
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
