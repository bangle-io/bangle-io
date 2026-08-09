import { describe, expect, test } from 'vitest';
import { type CrossTabRootEvent, rootEventWireCodec } from '../index';

const sender = { id: 'sender-tab', tag: 'test' };

const events = [
  {
    event: 'event::file:update',
    payload: {
      type: 'file-rename',
      wsPath: 'notes:next.md',
      oldWsPath: 'notes:previous.md',
      sender,
    },
  },
  {
    event: 'event::file:force-update',
    payload: { sender },
  },
  {
    event: 'event::app:reload-ui',
    payload: { sender },
  },
  {
    event: 'event::app:build-presence',
    payload: {
      protocol: 1,
      buildId: 'build-42',
      builtAt: 1_700_000_000_000,
      reply: true,
      sender,
    },
  },
] as const satisfies readonly CrossTabRootEvent[];

describe('rootEventWireCodec', () => {
  test.each(
    events,
  )('encodes $event as a backward-compatible v1 envelope', (event) => {
    expect(rootEventWireCodec.encode(event)).toEqual({ version: 1, ...event });
  });

  test.each(events)('decodes versioned $event envelopes', (event) => {
    expect(rootEventWireCodec.decode({ version: 1, ...event })).toEqual(event);
  });

  test.each(events)('decodes legacy $event envelopes', (event) => {
    expect(rootEventWireCodec.decode(event)).toEqual(event);
  });
});
