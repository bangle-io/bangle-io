import { useDialog } from '@react-aria/dialog';
import { FocusScope } from '@react-aria/focus';
import {
  OverlayContainer,
  useModal,
  useOverlay,
  usePreventScroll,
} from '@react-aria/overlays';
import React, { useCallback } from 'react';

import { cx } from '@bangle.io/utils';

import { Button } from '../Button/Button';
import { LoadingCircleIcon } from '../Icons';

export type CTAConfig = {
  isDestructive?: boolean;
  text: string;
  onPress: () => void;
  disabled?: boolean;
};

export function Dialog({
  children,
  dismissText = 'Close',
  headingTitle,
  headingIcon = null,
  footer = null,
  heroImageUrl,
  isDismissable = false,
  isKeyboardDismissDisabled = !isDismissable,
  // if true prevents dismissing the dialog and shows
  // loading state to user.
  isLoading = false,
  onDismiss,
  primaryButtonConfig,
  size = 'medium',
}: {
  children: React.ReactNode;
  headingIcon?: React.ReactNode;
  dismissText?: string;
  footer?: React.ReactNode;
  headingTitle: string;
  heroImageUrl?: string;
  isDismissable: boolean;
  isKeyboardDismissDisabled?: boolean;
  isLoading?: boolean;
  onDismiss: () => void;
  primaryButtonConfig?: CTAConfig;
  size?: 'small' | 'medium' | 'large';
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  const _onDismiss = useCallback(() => {
    if (!isLoading) {
      onDismiss();
    }
  }, [isLoading, onDismiss]);

  const { overlayProps, underlayProps } = useOverlay(
    {
      isOpen: true,
      onClose: _onDismiss,
      isDismissable,
      isKeyboardDismissDisabled,
    },
    ref,
  );

  const { modalProps } = useModal();
  const { dialogProps, titleProps } = useDialog({ role: 'alertdialog' }, ref);

  usePreventScroll();

  return (
    <OverlayContainer
      portalContainer={
        // since getElementById returns null, fallback to undefined
        // for tests
        document.getElementById('dialog-container') || undefined
      }
    >
      <div
        className="B-ui-components_dialog-underlay transition-opacity"
        {...underlayProps}
      >
        <FocusScope contain restoreFocus autoFocus>
          <div
            className={cx(
              'B-ui-components_dialog-content-container',
              size === 'small' && 'BU_small',
              size === 'medium' && 'BU_medium',
              size === 'large' && 'BU_large',
            )}
            {...overlayProps}
            {...dialogProps}
            {...modalProps}
            ref={ref}
          >
            {heroImageUrl && (
              <div className="B-ui-components_dialog-hero">
                <img src={heroImageUrl} alt="hero" />
              </div>
            )}
            <div className="B-ui-components_dialog-header-icon ">
              {isLoading ? (
                <div
                  role="progressbar"
                  className="inline-block"
                  aria-label="Loading..."
                >
                  <LoadingCircleIcon className="w-6 h-6" />
                </div>
              ) : (
                headingIcon
              )}
            </div>
            <h2
              className="B-ui-components_dialog-heading text-xl font-semibold break-all"
              {...titleProps}
            >
              {headingTitle}
            </h2>
            <hr className="B-ui-components_dialog-divider" />
            <div className="B-ui-components_dialog-content">
              {typeof children === 'string' ? <p>{children}</p> : children}
            </div>

            <div className="B-ui-components_dialog-button-group flex flex-row-reverse justify-start pt-12 pl-6">
              {primaryButtonConfig && (
                <Button
                  className="ml-3"
                  variant={
                    primaryButtonConfig.isDestructive
                      ? 'destructive'
                      : 'primary'
                  }
                  isDisabled={isLoading || primaryButtonConfig.disabled}
                  ariaLabel={primaryButtonConfig.text}
                  onPress={() => {
                    primaryButtonConfig.onPress();
                  }}
                >
                  {primaryButtonConfig.text}
                </Button>
              )}
              {isDismissable && (
                <Button
                  variant="secondary"
                  ariaLabel={'dismiss'}
                  isDisabled={isLoading}
                  onPress={_onDismiss}
                  autoFocus={primaryButtonConfig?.isDestructive}
                >
                  {dismissText}
                </Button>
              )}
            </div>
            <footer className="B-ui-components_dialog-footer">{footer}</footer>
          </div>
        </FocusScope>
      </div>
    </OverlayContainer>
  );
}
