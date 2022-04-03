import { useDialog } from '@react-aria/dialog';
import { FocusScope } from '@react-aria/focus';
import {
  OverlayContainer,
  useModal,
  useOverlay,
  usePreventScroll,
} from '@react-aria/overlays';
import React from 'react';

import { cx } from '@bangle.io/utils';

import { Button } from '../Button/Button';

export type CTAConfig = {
  isDestructive?: boolean;
  text: string;
  onPress: () => void;
  disabled?: boolean;
};

export function AlertModal({
  // CTA - call to action
  primaryButtonConfig,
  children,
  dismissText = 'Close',
  headingTitle,
  heroImageUrl,
  isDismissable = false,
  isKeyboardDismissDisabled = !isDismissable,
  onClose,
  size = 'medium',
}: {
  primaryButtonConfig?: CTAConfig;
  children: React.ReactNode;
  dismissText?: string;
  headingTitle: string;
  heroImageUrl?: string;
  isDismissable: boolean;
  isKeyboardDismissDisabled?: boolean;
  onClose: () => void;
  size?: 'small' | 'medium' | 'large';
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { overlayProps, underlayProps } = useOverlay(
    {
      isOpen: true,
      onClose: onClose,
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
        document.getElementById('modal-container') || undefined
      }
    >
      <div
        className="B-ui-components_alert-modal-underlay transition-opacity"
        {...underlayProps}
      >
        <FocusScope contain restoreFocus autoFocus>
          <div
            className={cx(
              'B-ui-components_alert-modal-content-container',
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
              <div className="B-ui-components_alert-modal-hero">
                <img src={heroImageUrl} alt="hero" />
              </div>
            )}
            <h2
              className="B-ui-components_alert-modal-heading text-xl font-semibold break-all"
              {...titleProps}
            >
              {headingTitle}
            </h2>
            <hr className="B-ui-components_alert-modal-divider" />
            <div className="B-ui-components_alert-modal-content">
              {typeof children === 'string' ? <p>{children}</p> : children}
            </div>
            <div className="B-ui-components_alert-modal-button-group flex flex-row-reverse justify-start pt-12 pl-6">
              {primaryButtonConfig && (
                <Button
                  className="ml-3"
                  variant={
                    primaryButtonConfig.isDestructive
                      ? 'destructive'
                      : 'primary'
                  }
                  isDisabled={primaryButtonConfig.disabled}
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
                  onPress={onClose}
                  autoFocus={primaryButtonConfig?.isDestructive}
                >
                  {dismissText}
                </Button>
              )}
            </div>
          </div>
        </FocusScope>
      </div>
    </OverlayContainer>
  );
}
