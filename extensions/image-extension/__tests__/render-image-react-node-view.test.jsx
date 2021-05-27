import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { useWorkspacePath, getFile } from 'workspace/index';
import { ImageComponent } from '../render-image-react-node-view';
import { sleep } from 'utils/utility';

jest.mock('workspace/index', () => {
  const workspaceThings = jest.requireActual('workspace/index');
  return {
    ...workspaceThings,
    useWorkspacePath: jest.fn(),
    getFile: jest.fn(),
  };
});
class File {
  constructor(content, fileName, opts) {
    this.content = content;
    this.fileName = fileName;
    this.opts = opts;
  }
}
describe('ImageComponent', () => {
  const globalImage = window.Image;
  beforeEach(() => {
    window.Image = class Imgx {
      constructor() {
        this.height = 300;
        this.width = 200;
        setTimeout(() => {
          this.onload();
        }, 5);
      }
    };
    window.URL.createObjectURL = jest.fn((file) => 'blob:' + file.content);
    window.URL.revokeObjectURL = jest.fn();
  });
  afterEach(() => {
    window.Image = globalImage;
  });
  test('first pass renders a 404', async () => {
    useWorkspacePath.mockImplementation(() => ({}));
    const renderResult = render(
      <ImageComponent nodeAttrs={{ src: './google.png', alt: undefined }} />,
    );

    expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <img
          alt="./google.png"
          loading="lazy"
          src="/404.png"
        />
      </div>
    `);
  });

  test('loads the file blob', async () => {
    useWorkspacePath.mockImplementation(() => ({
      wsPath: 'test-ws:my-file.md',
    }));
    getFile.mockImplementation(async () => {
      return new File('I am the content of image', 'google.png', {});
    });
    const renderResult = render(
      <ImageComponent nodeAttrs={{ src: './google.png', alt: undefined }} />,
    );

    const prom = sleep(20);

    // wait for the promise in click to resolve
    await act(() => prom);

    expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <img
          alt="./google.png"
          height="300"
          loading="lazy"
          src="blob:I am the content of image"
          width="200"
        />
      </div>
    `);
  });

  test('handles http urls as image src', async () => {
    useWorkspacePath.mockImplementation(() => ({
      wsPath: 'test-ws:my-file.md',
    }));
    const renderResult = render(
      <ImageComponent
        nodeAttrs={{
          src: 'https://abcd.google.png',
          alt: undefined,
        }}
      />,
    );

    expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <img
          alt="https://abcd.google.png"
          loading="lazy"
          src="https://abcd.google.png"
        />
      </div>
    `);
  });

  test('handles image dimensions that are statically set in the name', async () => {
    useWorkspacePath.mockImplementation(() => ({
      wsPath: 'test-ws:my-file.md',
    }));
    getFile.mockImplementation(async () => {
      return new File('I am the content of image', 'google.png', {});
    });
    const renderResult = render(
      <ImageComponent
        nodeAttrs={{
          src: 'google-4x3.png',
          alt: undefined,
        }}
      />,
    );
    const prom = sleep(20);
    // wait for the promise in click to resolve
    await act(() => prom);
    expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <img
          alt="google-4x3.png"
          height="3"
          loading="lazy"
          src="blob:I am the content of image"
          width="4"
        />
      </div>
    `);
  });
});
