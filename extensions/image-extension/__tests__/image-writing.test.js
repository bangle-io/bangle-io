import { createImage } from '../image-writing';

describe('createImage', () => {
  const dateNow = Date.now;
  beforeEach(() => {
    Date.now = jest.fn(() => 1620164973551);
  });
  afterEach(() => {
    Date.now = dateNow;
  });
  test('it works without extension', async () => {
    const result = await createImage('my-file', 'test-ws');

    expect(result).toEqual({
      srcUrl: expect.stringMatching(
        /^\/assets\/images\/my-file-2021-05-04-\d\d-\d\d-33-551$/,
      ),

      wsPath: expect.stringMatching(
        /^test-ws:assets\/images\/my-file-2021-05-04-\d\d-\d\d-33-551$/,
      ),
    });
  });

  test('it works with .png', async () => {
    const result = await createImage('my-file.png', 'test-ws');

    expect(result).toEqual({
      srcUrl: expect.stringMatching(
        /^\/assets\/images\/my-file-2021-05-04-\d\d-\d\d-33-551\.png$/,
      ),

      wsPath: expect.stringMatching(
        /^test-ws:assets\/images\/my-file-2021-05-04-\d\d-\d\d-33-551\.png$/,
      ),
    });
  });

  test('it works with spaces', async () => {
    const result = await createImage('my file.png', 'test-ws');

    expect(result).toEqual({
      srcUrl: expect.stringMatching(
        /^\/assets\/images\/my%20file-2021-05-04-\d\d-\d\d-33-551\.png$/,
      ),

      wsPath: expect.stringMatching(
        /^test-ws:assets\/images\/my file-2021-05-04-\d\d-\d\d-33-551\.png$/,
      ),
    });
  });
});
