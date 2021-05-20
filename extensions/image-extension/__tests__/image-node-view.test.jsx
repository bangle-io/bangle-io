import { calcImageDimensions } from 'image-extension/calc-image-dimensions';
import { imageDimensionFromWsPath } from '../image-node-view';

describe('imageDimensionFromWsPath', () => {
  test('works', () => {
    const result = imageDimensionFromWsPath('something:msds/hello-1x2.png');
    expect(result).toEqual({
      height: 2,
      width: 1,
    });
  });

  test('undefined in incorrect syntax', () => {
    const result = imageDimensionFromWsPath('something:msds/hello-1x.png');
    expect(result).toEqual({});
  });
});

describe('calcImageDimensions', () => {
  const globalImage = window.Image;
  beforeEach(() => {
    window.Image = class Imgx {
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
