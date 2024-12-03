import { BaseError, expectType, throwAppError } from '@bangle.io/base-utils';
import {
  appendNoteExtension,
  assertSplitWsPath,
  assertedResolvePath,
  filePathToWsPath,
  pathJoin,
} from '@bangle.io/ws-path';
import { c, getCtx } from './helper';

import type { ThemePreference } from '@bangle.io/types';
import { Briefcase, FilePlus, Sun, Trash2 } from 'lucide-react';
import { validateInputPath } from './utils';

import { uiCommandHandlers } from './ui-command-handlers';
import { wsCommandHandlers } from './ws-command-handlers';

export const commandHandlers = [...uiCommandHandlers, ...wsCommandHandlers];
