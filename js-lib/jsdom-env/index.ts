import JsdomClass from 'jest-environment-jsdom';
import { TextEncoder } from 'util';

let originalStructuredClone = structuredClone;

interface Port {
  onmessage: ((o: { data: any }) => void) | undefined;
  postMessage: (arg: any) => void;
  close: () => void;
  _name: 'port1' | 'port2';
}

class MessageChannel {
  port1: Port = {
    onmessage: undefined,
    postMessage: (arg) => {
      setTimeout(() => {
        this.port2.onmessage?.({ data: originalStructuredClone(arg) });
      }, 0);
    },
    close: () => {
      this.port2.onmessage = undefined;
    },
    _name: 'port1',
  };

  port2: Port = {
    onmessage: undefined,
    postMessage: (arg) => {
      setTimeout(() => {
        this.port1.onmessage?.({ data: originalStructuredClone(arg) });
      }, 0);
    },
    close: () => {
      this.port2.onmessage = undefined;
    },
    _name: 'port2',
  };
}

export default class JSDOMEnvironment extends JsdomClass {
  async setup() {
    await super.setup();
    this.global.MessageChannel = MessageChannel as any;
    // for some reason structuredClone is removed or not added in the global object
    // during the JSDOM setup
    this.global.structuredClone = originalStructuredClone;
    this.global.Blob = require('buffer').Blob;
    this.global.TextEncoder = TextEncoder;
  }
}
