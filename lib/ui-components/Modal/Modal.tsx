import React, { useRef } from 'react';
import ReactDOM from 'react-dom';

import { cx, useKeybindings, useWatchClickOutside } from '@bangle.io/utils';

import { ButtonIcon } from '../ButtonIcon';
import { ErrorBoundary } from '../ErrorBoundary';
import { CloseIcon } from '../Icons';

export function Modal({
  children,
  onDismiss,
  containerClassName = '',
  title = '',
  onPressEnter,
  width = 'small',
}: {
  children: JSX.Element;
  onPressEnter?: () => void;
  onDismiss: () => void;
  containerClassName?: string;
  title?: string;
  width?: 'small' | 'large';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useWatchClickOutside(containerRef, onDismiss, () => {});

  useKeybindings(() => {
    return {
      Escape: () => {
        onDismiss();
        return true;
      },
      Enter: () => {
        if (onPressEnter) {
          onPressEnter();
          return true;
        }
        return false;
      },
    };
  }, [onDismiss, onPressEnter]);

  return ReactDOM.createPortal(
    <div
      className={cx('fixed z-50 inset-0 overflow-y-auto', containerClassName)}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed w-full h-full transition-opacity ui-components_modal-overlay"
        aria-hidden="true"
      ></div>

      <span
        className="hidden sm:inline-block sm:align-middle sm:h-screen"
        aria-hidden="true"
      >
        &#8203;
      </span>
      <div className="fixed inset-0 flex flex-col items-center">
        <div className="flex-grow pointer-events-none"></div>
        <div
          ref={containerRef}
          className={cx(
            'ui-components_modal-container rounded transition-all ui-components_modal-fadeInScaleAnimation',
            width === 'small' && 'md:max-w-lg',
            width === 'large' && 'md:max-w-xl',
          )}
        >
          {!title ? null : (
            <div className="w-full px-6 my-2 select-none ">
              <div className="flex flex-row justify-between pt-2 pb-2 text-3xl border-b-2 ui-components_modal-header ">
                <span>{title}</span>
                <ButtonIcon onClick={onDismiss} removeFocus={true}>
                  <CloseIcon className="w-6 h-6 rounded-sm hover:bangle-io_accentSecondary" />
                </ButtonIcon>
              </div>
            </div>
          )}
          <div
            className="overflow-y-auto"
            style={{
              maxHeight: 'var(--window-modal-maxHeight)',
            }}
          >
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </div>
        <div className="flex-grow pointer-events-none"></div>
      </div>
    </div>,
    document.getElementById('dropdown-container')!,
  );
}
