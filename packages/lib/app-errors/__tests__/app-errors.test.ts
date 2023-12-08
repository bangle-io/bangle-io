import { APP_ERROR_NAME, handleAppError, throwAppError } from '../app-error';

test('throwAppError throws an error with correct structure', () => {
  expect.hasAssertions();
  const testPayload = { wsName: 'testWorkspace' };

  try {
    throwAppError(
      APP_ERROR_NAME.workspaceNativeFSAuth,
      'My Error message',
      testPayload,
    );
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    expect(error.name).toBe('Error');
    expect(error.message).toBe('My Error message');

    expect(error.cause).toMatchObject({
      isBangleError: true,
      name: APP_ERROR_NAME.workspaceNativeFSAuth,
      payload: testPayload,
    });
  }
});

test('handleAppError correctly processes a Bangle error', () => {
  expect.hasAssertions();
  const testPayload = { wsName: 'testWorkspace' };

  try {
    throwAppError(
      APP_ERROR_NAME.workspaceNativeFSAuth,
      'My Error message',
      testPayload,
    );
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    const result = handleAppError(error, (info, providedError) => {
      expect(info).toMatchObject({
        name: APP_ERROR_NAME.workspaceNativeFSAuth,
        payload: testPayload,
      });

      expect(providedError).toBe(error);
    });

    expect(result).toBe(true);
  }
});
