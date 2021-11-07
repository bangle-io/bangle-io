import React, { useRef } from 'react';

import { cx, useKeybindings, useWatchClickOutside } from '@bangle.io/utils';

import { ButtonIcon } from '../ButtonIcon';
import { ErrorBoundary } from '../ErrorBoundary';
import { CloseIcon } from '../Icons';

export function Modal({
  children,
  onDismiss,
  containerClassName = '',
  className = '',
  title = '',
  style = {},
}: {
  children: JSX.Element;
  onDismiss: Function;
  containerClassName?: string;
  title?: string;
  className?: string;
  style?: any;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useWatchClickOutside(containerRef, onDismiss, () => {});

  useKeybindings(() => {
    return {
      Escape: () => {
        onDismiss();
        return true;
      },
    };
  }, [onDismiss]);

  return (
    <div
      className={cx('fixed z-50 inset-0 overflow-y-auto', containerClassName)}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="sm:block sm:p-0 flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <div
          className="b-modal-overlay-color fixed inset-0 transition-opacity bg-opacity-75"
          aria-hidden="true"
        ></div>

        <span
          className="sm:inline-block sm:align-middle sm:h-screen hidden"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div
          ref={containerRef}
          style={style}
          className={cx(
            'fadeInScaleAnimation inline-block align-bottom b-bg-stronger-color rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full',
            className,
          )}
        >
          <div className=" w-full px-6 my-2 select-none">
            <div className="b-border-bottom-color b-bg-stronger-color flex flex-row justify-between pt-2 pb-2 text-3xl border-b-2">
              <span>{title}</span>
              <ButtonIcon onClick={onDismiss} removeFocus={true}>
                <CloseIcon className="hover:b-accent-secondary w-6 h-6 rounded-sm" />
              </ButtonIcon>
            </div>
          </div>

          <div className="b-bg-stronger-color">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
