import { composeStories } from '@storybook/react';

export type { ComposedStoryFn } from '@storybook/types';

import * as stories from './workspace-dialog.stories';
export default composeStories(stories);
