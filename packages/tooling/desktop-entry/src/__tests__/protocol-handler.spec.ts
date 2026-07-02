import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerAppProtocol,
  resetAppProtocolRegistrationForTests,
} from '../protocol-handler';

describe('desktop protocol registration', () => {
  beforeEach(() => {
    resetAppProtocolRegistrationForTests();
  });

  it('registers the app protocol only once for the same browser dist', () => {
    const protocol = { handle: vi.fn() };
    const input = {
      browserDistDir: '/tmp/bangle-browser-dist',
      net: { fetch: vi.fn() },
      protocol,
    };

    expect(registerAppProtocol(input)).toBe(true);
    expect(registerAppProtocol(input)).toBe(false);

    expect(protocol.handle).toHaveBeenCalledTimes(1);
  });

  it('rejects re-registration for a different browser dist', () => {
    const protocol = { handle: vi.fn() };

    registerAppProtocol({
      browserDistDir: '/tmp/bangle-browser-dist',
      net: { fetch: vi.fn() },
      protocol,
    });

    expect(() =>
      registerAppProtocol({
        browserDistDir: '/tmp/other-browser-dist',
        net: { fetch: vi.fn() },
        protocol,
      }),
    ).toThrow(
      `Desktop app protocol is already registered for ${resolve('/tmp/bangle-browser-dist')}, cannot re-register for ${resolve('/tmp/other-browser-dist')}`,
    );
  });
});
