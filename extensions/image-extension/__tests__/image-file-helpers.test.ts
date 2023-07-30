/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { createWsPath } from '@bangle.io/ws-path';
import {
  calcImageDimensions,
  imageDimensionFromWsPath,
  parseTimestamp,
  setImageMetadataInWsPath,
} from '../image-file-helpers';

describe('imageDimensionFromWsPath', () => {
  test('works', () => {
    const result = imageDimensionFromWsPath(
      createWsPath('something:msds/hello-1x2.png'),
    );
    expect(result).toEqual({
      height: 2,
      width: 1,
    });
  });

  test('undefined in incorrect syntax', () => {
    const result = imageDimensionFromWsPath(
      createWsPath('something:msds/hello-1x.png'),
    );
    expect(result).toEqual(undefined);
  });
});

describe('setImageDimensionInWsPath', () => {
  const dateNow = Date.now;
  beforeEach(() => {
    Date.now = jest.fn(() => 1620164973551);
  });
  afterEach(() => {
    Date.now = dateNow;
  });

  test('replaces existingdimensions', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath(createWsPath('something:msds/hello-1x2.png')),
      {
        width: 12,
        height: 3,
      },
    );
    expect(result).toBe('something:msds/hello-12x3.png');
  });

  test('if not existing adds  new', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath('something:msds/hello-1x.png'),
      {
        width: 12,
        height: 3,
      },
    );
    expect(result).toBe('something:msds/hello-1x-12x3.png');
  });

  test('1st: doesnt confuse with directory name containing dimension', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath('something:msds/hello-4x5/my-file.png'),
      {
        width: 12,
        height: 3,
      },
    );
    expect(result).toBe('something:msds/hello-4x5/my-file-12x3.png');
  });

  test("2nd: doesn't confuse with directory name containing dimension", async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath('something:msds/hello-4x5/my-file-12x3.png'),
      {
        width: 9,
        height: 99,
      },
    );
    expect(result).toBe('something:msds/hello-4x5/my-file-9x99.png');
  });

  test('dimension is in the middle of filename are not parsed', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath('something:msds/hello/my-file-12x3-remaining123.png'),
      {
        width: 9,
        height: 99,
      },
    );
    expect(result).toBe(
      'something:msds/hello/my-file-12x3-remaining123-9x99.png',
    );
  });

  test('works if not inside a subdir', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath('something:my-file-12x3-remaining123.png'),
      {
        width: 9,
        height: 99,
      },
    );
    expect(result).toBe('something:my-file-12x3-remaining123-9x99.png');
  });

  test('works if not inside a subdir 2', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath('something:my-file.png'),
      {
        width: 9,
        height: 99,
      },
    );
    expect(result).toBe('something:my-file-9x99.png');
  });

  test('works if weird file name', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath('something:.png'),
      {
        width: 9,
        height: 99,
      },
    );
    expect(result).toBe('something:-9x99.png');
  });

  test('adds timestamp correctly', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath('something:my-file.png'),
      {
        width: 9,
        height: 99,
      },
      true,
    );
    expect(result).toBe('something:my-file-20210504214933551-9x99.png');
  });

  test('if timestamp already there updates it', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath('something:my-file-20200103144933551-9x99.png'),
      {
        width: 9,
        height: 99,
      },
      true,
    );
    expect(result).toBe('something:my-file-20210504214933551-9x99.png');
  });

  test('1 works if there is an invalid timestamp', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath('something:my-file-2020010314493355-9x99.png'),
      {
        width: 9,
        height: 99,
      },
      true,
    );
    expect(result).toBe(
      'something:my-file-2020010314493355-20210504214933551-9x99.png',
    );
  });

  test('2 works if there is an invalid timestamp', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath('something:my-file-20211304144933551-9x99.png'),
      {
        width: 9,
        height: 99,
      },
      true,
    );
    expect(result).toBe(
      'something:my-file-20211304144933551-20210504214933551-9x99.png',
    );
  });

  test('3 works if there is an invalid timestamp', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath('something:my-file-20211304144933551.png'),
      {
        width: 9,
        height: 99,
      },
      true,
    );
    expect(result).toBe(
      'something:my-file-20211304144933551-20210504214933551-9x99.png',
    );
  });

  test('4 works if there is an invalid timestamp and a valid timstamp', async () => {
    const result = await setImageMetadataInWsPath(
      createWsPath(
        'something:my-file-20211304144933551-20200504144933551-9x99.png',
      ),
      {
        width: 9,
        height: 99,
      },
      true,
    );
    expect(result).toBe(
      'something:my-file-20211304144933551-20210504214933551-9x99.png',
    );
  });
});

describe('calcImageDimensions', () => {
  const globalImage = window.Image;
  beforeEach(() => {
    (window as any).Image = class Image {
      height: number;
      width: number;
      onload: () => void;
      constructor() {
        setTimeout(() => {
          this.onload();
        }, 4);
        this.height = 300;
        this.width = 200;
      }
    };
  });
  afterEach(() => {
    window.Image = globalImage;
  });

  test('works', async () => {
    const result = await calcImageDimensions('my-blob::123');
    expect(result).toEqual({
      height: 300,
      width: 200,
    });
  });
});

describe('parseTimestamp', () => {
  test('it works', () => {
    const result = parseTimestamp(
      ['2014', '05', '19', '23', '51', '37', '339'].join(''),
    );
    expect(result).toEqual({
      year: 2014,
      month: 5,
      day: 19,
      hour: 23,
      minute: 51,
      second: 37,
      milliseconds: 339,
    });
  });
});
