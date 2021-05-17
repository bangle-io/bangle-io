import React, { useContext } from 'react';
import {
  ButtonIcon,
  CloseIcon,
  ExclamationIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from 'ui-components/index';
import { UIManagerContext } from 'ui-context';

export function NotificationArea({}) {
  const { notifications, dispatch } = useContext(UIManagerContext);
  return (
    <div className="z-50 fixed bottom-0 right-0">
      {notifications.map((n) => (
        <Notification
          key={n.uid}
          uid={n.uid}
          onDismiss={() => {
            dispatch({
              type: 'UI/DISMISS_NOTIFICATION',
              value: {
                uid: n.uid,
              },
            });
          }}
          content={n.content}
          buttons={n.buttons}
          severity={n.severity}
        />
      ))}
    </div>
  );
}

const Severity = {
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

export function Notification({ content = '', buttons, severity, onDismiss }) {
  return (
    <div
      className="relative shadow my-4 mx-4 w-96 p-2 duration-100 ease-in-out transition"
      style={{
        backgroundColor: 'var(--bg-stronger-color)',
        boxShadow: '0px 0px 4px 2px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div className="w-full flex flex-row ">
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
      <div className="w-full flex flex-row-reverse mt-3">
        {buttons &&
          buttons.map((b, i) => <React.Fragment key={i}>{b}</React.Fragment>)}
      </div>
    </div>
  );
}
