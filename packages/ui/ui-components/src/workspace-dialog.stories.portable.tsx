import { composeStory } from '@storybook/react';
import type React from 'react';

import meta, {
  Default as DefaultStory,
  InvalidWsName as InvalidWsNameStory,
  NativeFsError as NativeFsErrorStory,
  NativeFs as NativeFsStory,
} from './workspace-dialog.stories';

type PortableStory = React.ComponentType;

export const Default: PortableStory = composeStory(DefaultStory, meta);
export const NativeFs: PortableStory = composeStory(NativeFsStory, meta);
export const NativeFsError: PortableStory = composeStory(
  NativeFsErrorStory,
  meta,
);
export const InvalidWsName: PortableStory = composeStory(
  InvalidWsNameStory,
  meta,
);

const composedStories: Record<
  'Default' | 'NativeFs' | 'NativeFsError' | 'InvalidWsName',
  PortableStory
> = {
  Default,
  NativeFs,
  NativeFsError,
  InvalidWsName,
};

export default composedStories;
