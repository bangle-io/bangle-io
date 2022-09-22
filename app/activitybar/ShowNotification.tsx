import React from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import type { SerialOperationType, Severity } from '@bangle.io/shared-types';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationIcon,
  InformationCircleIcon,
} from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';

const SeverityLookup = {
  error: () => ({
    component: (
      <ExclamationCircleIcon
        className="w-5 h-5"
        style={{ color: 'var(--BV-severity-error-color)' }}
      />
    ),
    color: 'var(--BV-severity-error-color)',
  }),
  warning: () => ({
    component: (
      <ExclamationIcon
        className="w-5 h-5"
        style={{ color: 'var(--BV-severity-warning-color)' }}
      />
    ),
    color: 'var(--BV-severity-warning-color)',
  }),
  info: () => ({
    component: (
      <InformationCircleIcon
        className="w-5 h-5"
        style={{ color: 'var(--BV-severity-info-color)' }}
      />
    ),
    color: 'var(--BV-severity-info-color)',
  }),
  success: () => ({
    component: (
      <CheckCircleIcon
        className="w-5 h-5"
        style={{ color: 'var(--BV-severity-success-color)' }}
      />
    ),
    color: 'var(--BV-severity-success-color)',
  }),
};

export function ShowNotification({
  severity,
  title,
  widescreen,
  operation,
}: {
  title: string;
  severity: Severity;
  widescreen: boolean;
  operation?: SerialOperationType['name'];
}) {
  let text: string = severity;
  const { dispatchSerialOperation } = useSerialOperationContext();

  text = title;

  if (text.length > 24) {
    text = text.slice(0, 24) + '...';
  }

  return (
    <div className="B-activitybar_notification flex-row flex-1 flex justify-start ml-1 sm:ml-3">
      <ActionButton
        className="B-activitybar_notification-button B-activitybar_notification-button-small"
        isQuiet={!Boolean(operation)}
        style={{
          border: `1px solid ${SeverityLookup[severity]().color}`,
        }}
        onPress={() => {
          if (operation) {
            dispatchSerialOperation({ name: operation });
          }
        }}
        ariaLabel="Notification"
      >
        <ButtonContent
          size="small"
          icon={SeverityLookup[severity]().component}
          text={text}
          textClassName={cx(
            `capitalize truncate`,
            widescreen ? 'text-sm' : 'text-xs',
          )}
        />
      </ActionButton>
    </div>
  );
}
