import React from 'react';
import reactDOM from 'react-dom';

import { EditorDisplayType } from '@bangle.io/constants';
import { cx } from '@bangle.io/utils';

import { Editor, EditorProps } from './Editor';

export interface PopupEditorProps {
  popupContainerProps: {
    style?: React.CSSProperties;
    className?: string;
    positionProps: { [k: string]: any };
  };
  editorProps: Omit<EditorProps, 'editorDisplayType'>;
  noContent?: React.ReactNode;
}

export const PopupEditor = React.forwardRef<HTMLDivElement, PopupEditorProps>(
  ({ noContent, popupContainerProps, editorProps }, ref) => {
    return reactDOM.createPortal(
      <div
        ref={ref}
        className={cx(
          'py-4 pl-6 overflow-y-auto rounded-md',
          popupContainerProps.className,
        )}
        {...popupContainerProps.positionProps}
        style={popupContainerProps.style}
      >
        {noContent ? (
          noContent
        ) : (
          <Editor
            {...editorProps}
            editorDisplayType={EditorDisplayType.Popup}
          />
        )}
      </div>,
      document.getElementById('tooltip-container')!,
    );
  },
);
