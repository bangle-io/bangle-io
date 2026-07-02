import { composeStory } from '@storybook/react';
import type React from 'react';

import meta, {
  CreateNoteInput as CreateNoteInputStory,
  LongSingleSelect as LongSingleSelectStory,
} from './dialog-input-and-select.stories';

type PortableStory = React.ComponentType;

export const CreateNoteInput: PortableStory = composeStory(
  CreateNoteInputStory,
  meta,
);
export const LongSingleSelect: PortableStory = composeStory(
  LongSingleSelectStory,
  meta,
);

const composedStories: Record<
  'CreateNoteInput' | 'LongSingleSelect',
  PortableStory
> = {
  CreateNoteInput,
  LongSingleSelect,
};

export default composedStories;
