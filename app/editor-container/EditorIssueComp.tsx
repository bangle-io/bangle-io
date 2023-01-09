import React from 'react';

import type { Tone } from '@bangle.io/constants';
import { SEVERITY } from '@bangle.io/constants';
import type { EditorIssue } from '@bangle.io/slice-notification';
import {
  Button,
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
    component: <ExclamationCircleIcon />,
  }),
  [SEVERITY.WARNING]: () => ({
    component: <ExclamationIcon />,
  }),
  [SEVERITY.INFO]: () => ({
    component: <InformationCircleIcon />,
  }),
  [SEVERITY.SUCCESS]: () => ({
    component: <CheckCircleIcon />,
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
  const { severity } = editorIssue;
  let text: string = severity;

  text = editorIssue.title;

  if (text.length > 50) {
    text = text.slice(0, 50) + '...';
  }

  let tone: Tone = 'neutral';

  switch (severity) {
    case SEVERITY.ERROR: {
      tone = 'critical';
      break;
    }
    case SEVERITY.WARNING: {
      tone = 'caution';
      break;
    }
    case SEVERITY.INFO: {
      tone = 'neutral';
      break;
    }
    case SEVERITY.SUCCESS: {
      tone = 'positive';
      break;
    }
  }

  return (
    <Button
      variant="solid"
      tone={tone}
      onPress={onPress}
      className="capitalize truncate"
      size="sm"
      leftIcon={SeverityLookup[severity]().component}
      text={text}
      ariaLabel="Editor encountered an issue"
    />
  );
}
