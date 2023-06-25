import type { EternalVars, NaukarWorkerAPI } from '@bangle.io/shared-types';

import type { NaukarStore } from '../store';
import { abortableInterface } from './abortable';
import { editorInterface } from './editor';
import { testInterface } from './test';
import { workspaceInterface } from './workspace';

export function naukarWorkerAPI(
  naukarStore: NaukarStore,
  eternalVars: EternalVars,
  abortSignal: AbortSignal,
): NaukarWorkerAPI {
  const abortable = abortableInterface(naukarStore, eternalVars);
  const editor = editorInterface(naukarStore, eternalVars, abortSignal);
  const test = testInterface(naukarStore);
  const workspace = workspaceInterface(naukarStore);

  return {
    abortable,
    editor,
    workspace,
    test,
  };
}
