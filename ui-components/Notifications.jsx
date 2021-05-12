import React, { useState, useEffect, useCallback } from 'react';
import { ButtonIcon } from './ButtonIcon';
import { CloseIcon } from './Icons';

export function NotificationWrapper({
  notifications = [
    {
      uid: 'foo',
      dismissed: false,
      content:
        'Looks like you modified the files in this workspace. Changes made to this workspace are temporary and might disappear on next reload. ',
    },
  ],
}) {
  const [_notifications, updateNotifications] = useState([]);

  useEffect(() => {
    const existingUids = new Set(_notifications.map((n) => n.uid));
    const newNots = notifications.filter((n) => !existingUids.has(n.uid));
    if (newNots.length > 0) {
      updateNotifications([..._notifications, ...newNots]);
    }
  }, [notifications, _notifications]);

  const dismissedNotification = useCallback((uid) => {
    updateNotifications((notifications) =>
      notifications.map((nn) => {
        if (nn.uid !== uid) {
          return nn;
        }
        return {
          ...nn,
          dismissed: true,
        };
      }),
    );
  }, []);

  return (
    <div className="z-50 fixed bottom-0 right-0">
      {_notifications
        .filter((n) => !n.dismissed)
        .map((n) => (
          <Notification
            key={n.uid}
            uid={n.uid}
            onDismiss={() => {
              dismissedNotification(n.uid);
            }}
            content={n.content}
          />
        ))}
    </div>
  );
}

export function Notification({ content = '', onDismiss }) {
  return (
    <div
      className="relative shadow my-4 mx-4 w-96 p-2"
      style={{
        backgroundColor: 'var(--bg-stronger-color)',
        boxShadow: '0px 0px 4px 2px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div className="w-full flex flex-row ">
        <div className="w-full text-sm">
          <span>{content}</span>
        </div>
        <div>
          <ButtonIcon
            onClick={async (e) => {
              onDismiss();
            }}
          >
            <CloseIcon style={{ height: 16, width: 16 }} />
          </ButtonIcon>
        </div>
      </div>
      <div className="w-full flex flex-row-reverse">
        <button
          style={{
            backgroundColor: 'var(--accent-2-color)',
          }}
          className="group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 "
        >
          <span>Fork</span>
        </button>
      </div>
    </div>
  );
}
