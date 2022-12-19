import '../style';

import type { Story } from '@storybook/react';
import React from 'react';

import { Tone } from '@bangle.io/constants';

import { FolderIcon } from '../Icons';
import { ButtonV2, ButtonVariant } from './ButtonV2';

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
          variant={variant}
          leftIcon={leftIcon}
          text="Default"
        />
        <ButtonV2
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={Tone.Caution}
          variant={variant}
          leftIcon={leftIcon}
          text="Caution"
        />
        <ButtonV2
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={Tone.Critical}
          variant={variant}
          leftIcon={leftIcon}
          text="Critical"
        />
        <ButtonV2
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={Tone.Info}
          variant={variant}
          leftIcon={leftIcon}
          text="Info"
        />
        <ButtonV2
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={Tone.Neutral}
          variant={variant}
          leftIcon={leftIcon}
          text="Neutral"
        />
        <ButtonV2
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={Tone.Positive}
          variant={variant}
          leftIcon={leftIcon}
          text="Positive"
        />
        <ButtonV2
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={Tone.Promote}
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
      <ButtonVariantGroup variant={ButtonVariant.Solid} />
      <ButtonVariantGroup variant={ButtonVariant.Ghost} />
      <ButtonVariantGroup variant={ButtonVariant.Soft} />
      <ButtonVariantGroup variant={ButtonVariant.Transparent} />
    </>
  );
};

export const ButtonSizes: Story<Parameters<typeof ButtonV2>[0]> = (args) => {
  return (
    <div>
      <div>
        <div className="flex flex-row gap-2">
          <ButtonV2 tone={Tone.Neutral} text="XSmall" size="xs" />
          <ButtonV2 tone={Tone.Neutral} text="Small" size="sm" />
          <ButtonV2 tone={Tone.Neutral} text="Medium" size="md" />
          <ButtonV2 tone={Tone.Neutral} text="Large" size="lg" />
        </div>

        <div className="mt-3">Touch</div>
        <div className="flex flex-row gap-2">
          <ButtonV2 isTouch tone={Tone.Neutral} text="XSmall" size="xs" />
          <ButtonV2 isTouch tone={Tone.Neutral} text="Small" size="sm" />
          <ButtonV2 isTouch tone={Tone.Neutral} text="Medium" size="md" />
          <ButtonV2 isTouch tone={Tone.Neutral} text="Large" size="lg" />
        </div>
      </div>

      <div>
        <div className="flex flex-row gap-2">
          <ButtonV2
            variant={ButtonVariant.Ghost}
            tone={Tone.Neutral}
            text="XSmall"
            size="xs"
          />
          <ButtonV2
            variant={ButtonVariant.Ghost}
            tone={Tone.Neutral}
            text="Small"
            size="sm"
          />
          <ButtonV2
            variant={ButtonVariant.Ghost}
            tone={Tone.Neutral}
            text="Medium"
            size="md"
          />
          <ButtonV2
            variant={ButtonVariant.Ghost}
            tone={Tone.Neutral}
            text="Large"
            size="lg"
          />
        </div>

        <div className="mt-3">Touch</div>
        <div className="flex flex-row gap-2">
          <ButtonV2
            isTouch
            variant={ButtonVariant.Ghost}
            tone={Tone.Neutral}
            text="XSmall"
            size="xs"
          />
          <ButtonV2
            isTouch
            variant={ButtonVariant.Ghost}
            tone={Tone.Neutral}
            text="Small"
            size="sm"
          />
          <ButtonV2
            isTouch
            variant={ButtonVariant.Ghost}
            tone={Tone.Neutral}
            text="Medium"
            size="md"
          />
          <ButtonV2
            isTouch
            variant={ButtonVariant.Ghost}
            tone={Tone.Neutral}
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
        <span>Left</span>
        <div className="flex flex-row gap-2">
          <ButtonV2 leftIcon={<FolderIcon />} tone={Tone.Critical} size="xs" />
          <ButtonV2 leftIcon={<FolderIcon />} tone={Tone.Neutral} size="sm" />
          <ButtonV2 leftIcon={<FolderIcon />} tone={Tone.Promote} size="md" />
          <ButtonV2 leftIcon={<FolderIcon />} tone={Tone.Neutral} size="lg" />
        </div>
      </div>

      <div>
        <span>Left with text</span>
        <div className="flex flex-row gap-2">
          <ButtonV2
            leftIcon={<FolderIcon />}
            tone={Tone.Critical}
            text="XSmall"
            size="xs"
          />
          <ButtonV2
            leftIcon={<FolderIcon />}
            tone={Tone.Neutral}
            text="Small"
            size="sm"
          />
          <ButtonV2
            leftIcon={<FolderIcon />}
            tone={Tone.Promote}
            text="Medium"
            size="md"
          />
          <ButtonV2
            leftIcon={<FolderIcon />}
            tone={Tone.Neutral}
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
            tone={Tone.Critical}
            text="XSmall"
            size="xs"
          />
          <ButtonV2
            rightIcon={<FolderIcon />}
            tone={Tone.Neutral}
            text="Small"
            size="sm"
          />
          <ButtonV2
            rightIcon={<FolderIcon />}
            tone={Tone.Promote}
            text="Medium"
            size="md"
          />
          <ButtonV2
            rightIcon={<FolderIcon />}
            tone={Tone.Neutral}
            text="Large"
            size="lg"
          />
        </div>
      </div>
    </div>
  );
};
