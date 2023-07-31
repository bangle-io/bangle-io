/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { createImage } from '../image-writing';

describe('createImage', () => {
  const dateNow = Date.now;

  const dimensions = {
    height: 2,
    width: 1,
  };
  beforeEach(() => {
    Date.now = jest.fn(() => 1620164973551);
  });
  afterEach(() => {
    Date.now = dateNow;
  });

  test('it works with .png', async () => {
    const result = await createImage(
      'my-file.png',
      'test-ws',
      dimensions,
      true,
    );

    expect(result).toEqual({
      srcUrl: '/assets/images/my-file-20210504214933551-1x2.png',
      wsPath: 'test-ws:assets/images/my-file-20210504214933551-1x2.png',
    });
  });

  test('it works if there is an existing dimension', async () => {
    const result = await createImage(
      'my-file-1x3.png',
      'test-ws',
      dimensions,
      true,
    );

    expect(result).toEqual({
      srcUrl: '/assets/images/my-file-20210504214933551-1x2.png',

      wsPath: 'test-ws:assets/images/my-file-20210504214933551-1x2.png',
    });
  });

  test('it works if there is an existing timestamp', async () => {
    const result = await createImage(
      'my-file-20200303134933553.png',
      'test-ws',
      dimensions,
      true,
    );

    expect(result).toEqual({
      srcUrl: '/assets/images/my-file-20210504214933551-1x2.png',

      wsPath: 'test-ws:assets/images/my-file-20210504214933551-1x2.png',
    });
  });

  test('it works if there is an existing timestamp in the middle', async () => {
    const result = await createImage(
      'my-20200303134933553file.png',
      'test-ws',
      dimensions,
      true,
    );

    expect(result).toEqual({
      srcUrl: '/assets/images/myfile-20210504214933551-1x2.png',

      wsPath: 'test-ws:assets/images/myfile-20210504214933551-1x2.png',
    });
  });

  test('it works if the timestamp is missing a -', async () => {
    const result = await createImage(
      'my20190303134933553file.png',
      'test-ws',
      dimensions,
      true,
    );

    expect(result).toEqual({
      srcUrl:
        '/assets/images/my20190303134933553file-20210504214933551-1x2.png',
      wsPath:
        'test-ws:assets/images/my20190303134933553file-20210504214933551-1x2.png',
    });
  });

  test('it works if there is an incorrect timestamp', async () => {
    const result = await createImage(
      'my-file-10200303134933553.png',
      'test-ws',
      dimensions,
      true,
    );

    expect(result).toEqual({
      srcUrl:
        '/assets/images/my-file-10200303134933553-20210504214933551-1x2.png',

      wsPath:
        'test-ws:assets/images/my-file-10200303134933553-20210504214933551-1x2.png',
    });
  });

  test('it works with spaces', async () => {
    const result = await createImage(
      'my file.png',
      'test-ws',
      dimensions,
      true,
    );

    expect(result).toEqual({
      srcUrl: '/assets/images/my%20file-20210504214933551-1x2.png',
      wsPath: 'test-ws:assets/images/my file-20210504214933551-1x2.png',
    });
  });
});
