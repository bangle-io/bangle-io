export function setupMockMessageChannel() {
  interface Port {
    onmessage: ((o: { data: any }) => void) | undefined;
    postMessage: (arg: any) => void;
    close: () => void;
    _name: 'port1' | 'port2';
  }

  class MessageChannel {
    port1: Port = {
      onmessage: undefined,
      postMessage: jest.fn((arg) => {
        this.port2.onmessage?.({ data: JSON.parse(JSON.stringify(arg)) });
      }),
      close: jest.fn(),
      _name: 'port1',
    };

    port2: Port = {
      onmessage: undefined,
      postMessage: jest.fn((arg) => {
        this.port1.onmessage?.({ data: JSON.parse(JSON.stringify(arg)) });
      }),
      close: jest.fn(),
      _name: 'port2',
    };
  }

  (global as any).MessageChannel = MessageChannel;

  return () => {
    (global as any).MessageChannel = undefined;
  };
}
