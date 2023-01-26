import React from 'react';
import reactDOM from 'react-dom';

import { EditorDisplayType, POPUP_EDITOR_INDEX } from '@bangle.io/constants';
import { vars } from '@bangle.io/css-vars';
import { cx } from '@bangle.io/utils';

import type { EditorProps } from './Editor';
import { Editor } from './Editor';

export interface PopupEditorProps {
  popupContainerProps: {
    style?: React.CSSProperties;
    className?: string;
    positionProps: { [k: string]: any };
  };
  editorProps: Omit<EditorProps, 'editorDisplayType' | 'editorId'>;
  noContent?: React.ReactNode;
}

export const PopupEditor = React.forwardRef<HTMLDivElement, PopupEditorProps>(
  ({ noContent, popupContainerProps, editorProps }, ref) => {
    return reactDOM.createPortal(
      <div
        ref={ref}
        className={cx(
          'py-4 pl-6 overflow-y-auto rounded-md ',
          popupContainerProps.className,
        )}
        {...popupContainerProps.positionProps}
        style={{
          ...popupContainerProps.style,
          backgroundColor: vars.misc.editorBg,
        }}
      >
        {noContent ? (
          noContent
        ) : (
          <Editor
            {...editorProps}
            editorId={POPUP_EDITOR_INDEX}
            editorDisplayType={EditorDisplayType.Floating}
          />
        )}
      </div>,
      document.getElementById('tooltip-container')!,
    );
  },
);
