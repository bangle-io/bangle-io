import type { EternalVars, NaukarWorkerAPI } from '@bangle.io/shared-types';

import type { NaukarStore } from '../store';
import { abortableInterface } from './abortable';
import { editorInterface } from './editor';
import { replicaSlicesInterface } from './replica-slices';
import { testInterface } from './test-interface';
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
  const replicaSlices = replicaSlicesInterface(naukarStore, eternalVars);

  return {
    abortable,
    editor,
    workspace,
    test,
    replicaSlices,
  };
}
