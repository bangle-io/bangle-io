import React from 'react';

import { SEVERITY } from '@bangle.io/constants';
import type { EditorIssue } from '@bangle.io/slice-notification';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationIcon,
  InformationCircleIcon,
} from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';

export function EditorIssueComp({
  className,
  onPress,
  editorIssue,
}: {
  className?: string;
  onPress: () => void;
  editorIssue: EditorIssue;
}) {
  return (
    <div className={cx('relative w-full', className)}>
      <div className="absolute inset-x-0 mx-auto rounded-md w-full flex flex-col gap-1 items-center">
        <EditorIssueInner
          editorIssue={editorIssue}
          widescreen={false}
          onPress={onPress}
        />
      </div>
    </div>
  );
}

const SeverityLookup = {
  [SEVERITY.ERROR]: () => ({
    component: (
      <ExclamationCircleIcon
        className="w-5 h-5"
        style={{ color: 'var(--BV-severity-error-color)' }}
      />
    ),
    color: 'var(--BV-severity-error-color)',
  }),
  [SEVERITY.WARNING]: () => ({
    component: (
      <ExclamationIcon
        className="w-5 h-5"
        style={{ color: 'var(--BV-severity-warning-color)' }}
      />
    ),
    color: 'var(--BV-severity-warning-color)',
  }),
  [SEVERITY.INFO]: () => ({
    component: (
      <InformationCircleIcon
        className="w-5 h-5"
        style={{ color: 'var(--BV-severity-info-color)' }}
      />
    ),
    color: 'var(--BV-severity-info-color)',
  }),
  [SEVERITY.SUCCESS]: () => ({
    component: (
      <CheckCircleIcon
        className="w-5 h-5"
        style={{ color: 'var(--BV-severity-success-color)' }}
      />
    ),
    color: 'var(--BV-severity-success-color)',
  }),
};

function EditorIssueInner({
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
            severity === SEVERITY.ERROR
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
