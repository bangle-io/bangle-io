import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  formatDevPorts,
  getDevPorts,
  MIN_DEV_PORT,
  PORT_BUCKET_COUNT,
  PORT_ROLES,
} from './dev-ports.js';

describe('dev-ports', () => {
  beforeEach(() => {
    for (const config of Object.values(PORT_ROLES)) {
      vi.stubEnv(config.env, '');
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('derives deterministic ports from an explicit seed', () => {
    const first = getDevPorts({ explicitSeed: 'worktree-a' });
    const second = getDevPorts({ explicitSeed: 'worktree-a' });

    expect(first).toEqual(second);
    expect(first.slot).toBeGreaterThanOrEqual(0);
    expect(first.slot).toBeLessThan(PORT_BUCKET_COUNT);

    for (const [role, config] of Object.entries(PORT_ROLES)) {
      expect(first.ports[role]).toBe(config.base + first.slot);
    }
  });

  test('honors explicit environment port overrides', () => {
    vi.stubEnv('BANGLE_DEV_PORT', '5555');
    vi.stubEnv('BANGLE_E2E_CT_PORT', '3555');

    const result = getDevPorts({ explicitSeed: 'worktree-a' });

    expect(result.ports.dev).toBe(5555);
    expect(result.ports['e2e-ct']).toBe(3555);
    expect(result.ports.preview).toBe(PORT_ROLES.preview.base + result.slot);
  });

  test('rejects low port overrides', () => {
    vi.stubEnv('BANGLE_DEV_PORT', '2999');

    expect(() => getDevPorts({ explicitSeed: 'worktree-a' })).toThrow(
      `BANGLE_DEV_PORT must be an integer port from ${MIN_DEV_PORT}`,
    );
  });

  test('prints shell exports for command setup', () => {
    const result = getDevPorts({ explicitSeed: "branch ' one" });

    expect(formatDevPorts(result, 'env')).toContain(
      "export BANGLE_PORT_SEED='branch '\\'' one'",
    );
    expect(formatDevPorts(result, 'env')).toContain(
      `export BANGLE_DEV_PORT=${result.ports.dev}`,
    );
    expect(formatDevPorts(result, 'env')).toContain(
      `export BANGLE_E2E_CT_PORT=${result.ports['e2e-ct']}`,
    );
  });
});
