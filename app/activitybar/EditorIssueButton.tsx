import React from 'react';

import type { EditorIssue } from '@bangle.io/slice-notification';
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

export function EditorIssueButton({
  editorIssue,
  widescreen,
  onPress,
}: {
  editorIssue: EditorIssue;
  widescreen: boolean;
  onPress: () => void;
}) {
  const { serialOperation, severity } = editorIssue;
  let text: string = severity;

  text = editorIssue.title;

  if (text.length > 50) {
    text = text.slice(0, 50) + '...';
  }

  return (
    <div className="B-activitybar_notification">
      <ActionButton
        className="B-activitybar_notification-button "
        isQuiet={!Boolean(serialOperation)}
        style={{
          border: `1px solid ${SeverityLookup[severity]().color}`,
          backgroundColor:
            severity === 'error'
              ? 'var(--BV-error-bg-color)'
              : 'var(--BV-window-tooltip-bg-color)',
        }}
        onPress={() => {
          onPress();
        }}
        ariaLabel="Editor encountered an issue"
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
