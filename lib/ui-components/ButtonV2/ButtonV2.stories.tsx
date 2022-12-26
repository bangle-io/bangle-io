import '../style';

import type { Story } from '@storybook/react';
import React from 'react';

import { TONE } from '@bangle.io/constants';

import { CloseIcon, FolderIcon } from '../Icons';
import type { ButtonVariant } from './ButtonV2';
import { BUTTON_VARIANT, ButtonV2 } from './ButtonV2';

export default {
  title: 'ui-components/ButtonV2',
  component: ButtonV2,
  argTypes: {},
};

function ButtonGroup({
  variant,
  isDisabled,
  isTouch,
  animateOnPress,
  leftIcon,
}: {
  isDisabled?: boolean;
  isTouch?: boolean;
  variant: ButtonVariant;
  animateOnPress?: boolean;
  leftIcon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-row gap-2">
        <ButtonV2
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={TONE.NEUTRAL}
          variant={variant}
          leftIcon={leftIcon}
          text="Neutral"
        />
        <ButtonV2
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          variant={variant}
          leftIcon={leftIcon}
          tone={TONE.SECONDARY}
          text="Secondary"
        />
        <ButtonV2
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={TONE.CAUTION}
          variant={variant}
          leftIcon={leftIcon}
          text="Caution"
        />
        <ButtonV2
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={TONE.CRITICAL}
          variant={variant}
          leftIcon={leftIcon}
          text="Critical"
        />

        <ButtonV2
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={TONE.POSITIVE}
          variant={variant}
          leftIcon={leftIcon}
          text="Positive"
        />
        <ButtonV2
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={TONE.PROMOTE}
          variant={variant}
          leftIcon={leftIcon}
          text="Promote"
        />
      </div>
    </div>
  );
}

function ButtonVariantGroup({ variant }: { variant: ButtonVariant }) {
  return (
    <>
      <div className="text-xl font-600 mt-6">{variant}</div>
      <div className="flex flex-row gap-2">
        <ButtonGroup variant={variant} />
      </div>
      <div className="mt-3">
        <h3>disabled</h3>
        <ButtonGroup isDisabled variant={variant} />
      </div>
      <div className="mt-3">
        <h3>animate on press disabled</h3>
        <ButtonGroup animateOnPress={false} variant={variant} />
      </div>
      <div className="mt-3">
        <h3>touch</h3>
        <ButtonGroup isTouch variant={variant} />
      </div>
      <div className="mt-3">
        <h3>leftIcon</h3>
        <ButtonGroup leftIcon={<FolderIcon />} isTouch variant={variant} />
      </div>
    </>
  );
}

export const ButtonVariants: Story<Parameters<typeof ButtonV2>[0]> = (args) => {
  return (
    <>
      <ButtonVariantGroup variant={BUTTON_VARIANT.SOLID} />
      <ButtonVariantGroup variant={BUTTON_VARIANT.GHOST} />
      <ButtonVariantGroup variant={BUTTON_VARIANT.SOFT} />
      <ButtonVariantGroup variant={BUTTON_VARIANT.TRANSPARENT} />
    </>
  );
};

export const ButtonSizes: Story<Parameters<typeof ButtonV2>[0]> = (args) => {
  return (
    <div>
      <div>
        <div className="flex flex-row gap-2">
          <ButtonV2 tone={TONE.NEUTRAL} text="XSmall" size="xs" />
          <ButtonV2 tone={TONE.NEUTRAL} text="Small" size="sm" />
          <ButtonV2 tone={TONE.NEUTRAL} text="Medium" size="md" />
          <ButtonV2 tone={TONE.NEUTRAL} text="Large" size="lg" />
        </div>

        <div className="mt-3">Touch</div>
        <div className="flex flex-row gap-2">
          <ButtonV2 isTouch tone={TONE.NEUTRAL} text="XSmall" size="xs" />
          <ButtonV2 isTouch tone={TONE.NEUTRAL} text="Small" size="sm" />
          <ButtonV2 isTouch tone={TONE.NEUTRAL} text="Medium" size="md" />
          <ButtonV2 isTouch tone={TONE.NEUTRAL} text="Large" size="lg" />
        </div>
      </div>

      <div>
        <div className="flex flex-row gap-2">
          <ButtonV2
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="XSmall"
            size="xs"
          />
          <ButtonV2
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="Small"
            size="sm"
          />
          <ButtonV2
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="Medium"
            size="md"
          />
          <ButtonV2
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="Large"
            size="lg"
          />
        </div>

        <div className="mt-3">Touch</div>
        <div className="flex flex-row gap-2">
          <ButtonV2
            isTouch
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="XSmall"
            size="xs"
          />
          <ButtonV2
            isTouch
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="Small"
            size="sm"
          />
          <ButtonV2
            isTouch
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="Medium"
            size="md"
          />
          <ButtonV2
            isTouch
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="Large"
            size="lg"
          />
        </div>
      </div>
    </div>
  );
};

export const ButtonIcons: Story<Parameters<typeof ButtonV2>[0]> = (args) => {
  return (
    <div>
      <div>
        <span>No text</span>
        <div className="flex flex-row gap-2">
          <ButtonV2 leftIcon={<FolderIcon />} tone={TONE.CRITICAL} size="xs" />
          <ButtonV2 leftIcon={<FolderIcon />} tone={TONE.NEUTRAL} size="sm" />
          <ButtonV2 leftIcon={<FolderIcon />} tone={TONE.PROMOTE} size="md" />
          <ButtonV2 leftIcon={<FolderIcon />} tone={TONE.PROMOTE} size="md" />
          <ButtonV2 leftIcon={<FolderIcon />} tone={TONE.NEUTRAL} size="lg" />
        </div>
      </div>

      <div>
        <span>No text</span>
        <div className="flex flex-row gap-2">
          <ButtonV2
            leftIcon={<FolderIcon />}
            tone={TONE.CRITICAL}
            size="xs"
            variant={BUTTON_VARIANT.TRANSPARENT}
          />
          <ButtonV2
            leftIcon={<FolderIcon />}
            tone={TONE.NEUTRAL}
            size="sm"
            variant={BUTTON_VARIANT.TRANSPARENT}
          />
          <ButtonV2
            leftIcon={<FolderIcon />}
            tone={TONE.PROMOTE}
            size="md"
            variant={BUTTON_VARIANT.TRANSPARENT}
          />
          <ButtonV2
            leftIcon={<CloseIcon />}
            tone={TONE.PROMOTE}
            size="md"
            variant={BUTTON_VARIANT.TRANSPARENT}
          />
          <ButtonV2
            leftIcon={<FolderIcon />}
            tone={TONE.NEUTRAL}
            size="lg"
            variant={BUTTON_VARIANT.TRANSPARENT}
          />
        </div>
      </div>

      <div>
        <span>Left with text</span>
        <div className="flex flex-row gap-2">
          <ButtonV2
            leftIcon={<FolderIcon />}
            tone={TONE.CRITICAL}
            text="XSmall"
            size="xs"
          />
          <ButtonV2
            leftIcon={<FolderIcon />}
            tone={TONE.NEUTRAL}
            text="Small"
            size="sm"
          />
          <ButtonV2
            leftIcon={<FolderIcon />}
            tone={TONE.PROMOTE}
            text="Medium"
            size="md"
          />
          <ButtonV2
            leftIcon={<FolderIcon />}
            tone={TONE.NEUTRAL}
            text="Large"
            size="lg"
          />
        </div>
      </div>

      <div>
        <span>right</span>
        <div className="flex flex-row gap-2">
          <ButtonV2
            rightIcon={<FolderIcon />}
            tone={TONE.CRITICAL}
            text="XSmall"
            size="xs"
          />
          <ButtonV2
            rightIcon={<FolderIcon />}
            tone={TONE.NEUTRAL}
            text="Small"
            size="sm"
          />
          <ButtonV2
            rightIcon={<FolderIcon />}
            tone={TONE.PROMOTE}
            text="Medium"
            size="md"
          />
          <ButtonV2
            rightIcon={<FolderIcon />}
            tone={TONE.NEUTRAL}
            text="Large"
            size="lg"
          />
        </div>
      </div>
    </div>
  );
};
