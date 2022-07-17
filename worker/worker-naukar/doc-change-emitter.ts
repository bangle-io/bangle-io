import type { CollabManager } from '@bangle.dev/collab-server';
import { Emitter } from '@bangle.dev/utils';

type Listener = (arg: DocChangeObj) => void;
type CollabState = NonNullable<ReturnType<CollabManager['getCollabState']>>;

export interface DocChangeObj {
  wsPath: string;
  newCollabState: CollabState;
  oldCollabState: CollabState;
}

const EVENT_NAME = 'doc_changed';

export class DocChangeEmitter {
  private _emitter = new Emitter();

  addListener(listener: Listener) {
    this._emitter.on(EVENT_NAME, listener);
  }

  destroy() {
    this._emitter.destroy();
  }

  emit(data: DocChangeObj): void {
    this._emitter.emit(EVENT_NAME, data);
  }

  removeListener(listener: Listener): void {
    this._emitter.off(EVENT_NAME, listener);
  }
}
