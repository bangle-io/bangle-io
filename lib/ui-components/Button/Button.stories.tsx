import '../style';

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { TONE } from '@bangle.io/constants';

import { CloseIcon, FolderIcon } from '../Icons';
import { Button } from './Button';
import type { ButtonVariant } from './common';
import { BUTTON_VARIANT } from './common';

const meta: Meta<typeof Button> = {
  title: 'ui-components/Button',
  component: Button,
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof Button>;

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
        <Button
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={TONE.NEUTRAL}
          variant={variant}
          leftIcon={leftIcon}
          text="Neutral"
        />
        <Button
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          variant={variant}
          leftIcon={leftIcon}
          tone={TONE.SECONDARY}
          text="Secondary"
        />
        <Button
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={TONE.CAUTION}
          variant={variant}
          leftIcon={leftIcon}
          text="Caution"
        />
        <Button
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={TONE.CRITICAL}
          variant={variant}
          leftIcon={leftIcon}
          text="Critical"
        />

        <Button
          animateOnPress={animateOnPress}
          isDisabled={isDisabled}
          isTouch={isTouch}
          tone={TONE.POSITIVE}
          variant={variant}
          leftIcon={leftIcon}
          text="Positive"
        />
        <Button
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

// Refactored Stories.
export const ButtonVariants: Story = {
  render: () => (
    <>
      <ButtonVariantGroup variant={BUTTON_VARIANT.SOLID} />
      <ButtonVariantGroup variant={BUTTON_VARIANT.GHOST} />
      <ButtonVariantGroup variant={BUTTON_VARIANT.SOFT} />
      <ButtonVariantGroup variant={BUTTON_VARIANT.TRANSPARENT} />
    </>
  ),
};

export const ButtonSizes: Story = {
  render: () => (
    <div>
      <div>
        <div className="flex flex-row gap-2">
          <Button tone={TONE.NEUTRAL} text="XSmall" size="xs" />
          <Button tone={TONE.NEUTRAL} text="Small" size="sm" />
          <Button tone={TONE.NEUTRAL} text="Medium" size="md" />
          <Button tone={TONE.NEUTRAL} text="Large" size="lg" />
        </div>

        <div className="mt-3">Touch</div>
        <div className="flex flex-row gap-2">
          <Button isTouch tone={TONE.NEUTRAL} text="XSmall" size="xs" />
          <Button isTouch tone={TONE.NEUTRAL} text="Small" size="sm" />
          <Button isTouch tone={TONE.NEUTRAL} text="Medium" size="md" />
          <Button isTouch tone={TONE.NEUTRAL} text="Large" size="lg" />
        </div>
      </div>

      <div>
        <div className="flex flex-row gap-2">
          <Button
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="XSmall"
            size="xs"
          />
          <Button
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="Small"
            size="sm"
          />
          <Button
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="Medium"
            size="md"
          />
          <Button
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="Large"
            size="lg"
          />
        </div>

        <div className="mt-3">Touch</div>
        <div className="flex flex-row gap-2">
          <Button
            isTouch
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="XSmall"
            size="xs"
          />
          <Button
            isTouch
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="Small"
            size="sm"
          />
          <Button
            isTouch
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="Medium"
            size="md"
          />
          <Button
            isTouch
            variant={BUTTON_VARIANT.GHOST}
            tone={TONE.NEUTRAL}
            text="Large"
            size="lg"
          />
        </div>

        <div className="mt-2 gap-1">Take space row</div>
        <div className="flex flex-row gap-2 ">
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="Medium"
            leftIcon={<FolderIcon />}
            size="md"
          />
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="Medium"
            size="md"
          />
        </div>

        <div className="mt-2 gap-1">Take space col</div>

        <div className="flex flex-col gap-2">
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="Medium"
            rightIcon={<FolderIcon />}
            size="md"
          />
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="Medium"
            leftIcon={<FolderIcon />}
            size="md"
          />
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            leftIcon={<FolderIcon />}
            size="md"
          />
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            rightIcon={<FolderIcon />}
            size="md"
          />
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="Medium"
            size="md"
          />
        </div>

        <div className="mt-2 gap-1">justifyContent start</div>
        <div className="flex flex-row gap-2 ">
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="Start"
            leftIcon={<FolderIcon />}
            justifyContent="flex-start"
            size="md"
          />
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="Start"
            justifyContent="flex-start"
            size="md"
          />
        </div>

        <div className="mt-2 gap-1">justifyContent end</div>
        <div className="flex flex-row gap-2 ">
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="End"
            leftIcon={<FolderIcon />}
            justifyContent="flex-end"
            size="md"
          />
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="End"
            justifyContent="flex-end"
            size="md"
          />
        </div>

        <div className="mt-2 gap-1">justifyContent around</div>
        <div className="flex flex-row gap-2 ">
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="End"
            leftIcon={<FolderIcon />}
            justifyContent="space-around"
            size="md"
          />
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="End"
            justifyContent="space-around"
            size="md"
          />
        </div>

        <div className="mt-2 gap-1">Trimming</div>

        <div
          className="flex flex-col gap-2"
          style={{ width: 'min(40vw,300px)' }}
        >
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="Long kangaroo text that should be trimmed for sure this time"
            rightIcon={<FolderIcon />}
            size="md"
          />
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="Long kangaroo text that should be trimmed"
            leftIcon={<FolderIcon />}
            size="md"
          />
          <Button
            isTouch
            tone={TONE.NEUTRAL}
            className="flex-grow-1"
            text="Long kangaroo text that should be trimmed"
            size="md"
          />
        </div>
      </div>
    </div>
  ),
};

export const ButtonIcons: Story = {
  render: () => (
    <div>
      <div>
        <span>No text</span>
        <div className="flex flex-row gap-2">
          <Button leftIcon={<FolderIcon />} tone={TONE.CRITICAL} size="xs" />
          <Button leftIcon={<FolderIcon />} tone={TONE.NEUTRAL} size="sm" />
          <Button leftIcon={<FolderIcon />} tone={TONE.PROMOTE} size="md" />
          <Button leftIcon={<FolderIcon />} tone={TONE.PROMOTE} size="md" />
          <Button leftIcon={<FolderIcon />} tone={TONE.NEUTRAL} size="lg" />
        </div>
      </div>

      <div>
        <span>No text</span>
        <div className="flex flex-row gap-2">
          <Button
            leftIcon={<FolderIcon />}
            tone={TONE.CRITICAL}
            size="xs"
            variant={BUTTON_VARIANT.TRANSPARENT}
          />
          <Button
            leftIcon={<FolderIcon />}
            tone={TONE.NEUTRAL}
            size="sm"
            variant={BUTTON_VARIANT.TRANSPARENT}
          />
          <Button
            leftIcon={<FolderIcon />}
            tone={TONE.PROMOTE}
            size="md"
            variant={BUTTON_VARIANT.TRANSPARENT}
          />
          <Button
            leftIcon={<CloseIcon />}
            tone={TONE.PROMOTE}
            size="md"
            variant={BUTTON_VARIANT.TRANSPARENT}
          />
          <Button
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
          <Button
            leftIcon={<FolderIcon />}
            tone={TONE.CRITICAL}
            text="XSmall"
            size="xs"
          />
          <Button
            leftIcon={<FolderIcon />}
            tone={TONE.NEUTRAL}
            text="Small"
            size="sm"
          />
          <Button
            leftIcon={<FolderIcon />}
            tone={TONE.PROMOTE}
            text="Medium"
            size="md"
          />
          <Button
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
          <Button
            rightIcon={<FolderIcon />}
            tone={TONE.CRITICAL}
            text="XSmall"
            size="xs"
          />
          <Button
            rightIcon={<FolderIcon />}
            tone={TONE.NEUTRAL}
            text="Small"
            size="sm"
          />
          <Button
            rightIcon={<FolderIcon />}
            tone={TONE.PROMOTE}
            text="Medium"
            size="md"
          />
          <Button
            rightIcon={<FolderIcon />}
            tone={TONE.NEUTRAL}
            text="Large"
            size="lg"
          />
        </div>
      </div>
    </div>
  ),
};
