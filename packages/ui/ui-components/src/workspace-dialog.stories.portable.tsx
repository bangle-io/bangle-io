import { composeStory } from '@storybook/react';
import type React from 'react';

import meta, {
  CreateFailure as CreateFailureStory,
  Default as DefaultStory,
  InvalidWsName as InvalidWsNameStory,
  NativeFsError as NativeFsErrorStory,
  NativeFs as NativeFsStory,
} from './workspace-dialog.stories';

type PortableStory = React.ComponentType;

const Default: PortableStory = composeStory(DefaultStory, meta);
const NativeFs: PortableStory = composeStory(NativeFsStory, meta);
const NativeFsError: PortableStory = composeStory(NativeFsErrorStory, meta);
const InvalidWsName: PortableStory = composeStory(InvalidWsNameStory, meta);
const CreateFailure: PortableStory = composeStory(CreateFailureStory, meta);

const composedStories: Record<
  'Default' | 'NativeFs' | 'NativeFsError' | 'InvalidWsName' | 'CreateFailure',
  PortableStory
> = {
  Default,
  NativeFs,
  NativeFsError,
  InvalidWsName,
  CreateFailure,
};

export default composedStories;
