import { expect, test } from 'vitest';
import { handleAppError, isAppError, throwAppError } from '../throw-app-error';

test('throwAppError throws an error with correct structure', () => {
  expect.hasAssertions();

  try {
    throwAppError('error::main:unknown', 'My Error message', {
      details: 'xyz',
    });
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    expect(error.name).toBe('BaseError');
    expect(error.message).toBe('My Error message');

    expect(error.cause).toMatchObject({
      isBangleAppError: true,
      name: 'error::main:unknown',
      payload: {
        details: 'xyz',
      },
    });
    expect(isAppError(error)).toBe(true);
  }
});

test('handleAppError correctly processes a Bangle error', () => {
  expect.hasAssertions();

  try {
    throwAppError('error::main:unknown', 'My Error message', {
      details: 'xyz',
    });
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    const result = handleAppError(error, (info, providedError) => {
      expect(info).toMatchObject({
        name: 'error::main:unknown',
        payload: {
          details: 'xyz',
        },
      });

      expect(providedError).toBe(error);
    });

    expect(result).toBe(true);
  }
});
