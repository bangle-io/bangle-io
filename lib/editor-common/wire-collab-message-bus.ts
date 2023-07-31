import { CollabMessageBus } from '@bangle.dev/collab-comms';

const seen = new WeakSet();

export function wireCollabMessageBus(
  port: MessagePort,
  messageBuss: CollabMessageBus,
  abortSignal: AbortSignal,
): CollabMessageBus {
  const unregister = messageBuss.receiveMessages(
    CollabMessageBus.WILD_CARD,
    (message) => {
      // prevent posting the same message that it received
      if (seen.has(message)) {
        return;
      }
      port.postMessage(message);
    },
  );

  abortSignal.addEventListener(
    'abort',
    () => {
      port.close();
      unregister();
      messageBuss.destroy();
    },
    {
      once: true,
    },
  );

  port.onmessage = ({ data }) => {
    seen.add(data);
    messageBuss.transmit(data);
  };

  return messageBuss;
}
