import { act, render } from '@testing-library/react';
import React from 'react';

import { getFile, useWorkspaceContext } from '@bangle.io/slice-workspace';
import { getUseWorkspaceContextReturn } from '@bangle.io/test-utils/function-mock-return';
import { sleep } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { ImageComponent } from '../render-image-react-node-view';

jest.mock('@bangle.io/slice-workspace', () => {
  const other = jest.requireActual('@bangle.io/slice-workspace');

  return {
    ...other,
    useWorkspaceContext: jest.fn(),
    getFile: jest.fn(() => async () => undefined),
  };
});

class File {
  constructor(public content, public fileName, public opts) {}
}

let useWorkspaceContextMock = useWorkspaceContext as jest.MockedFunction<
  typeof useWorkspaceContext
>;
let getFileMock = getFile as jest.MockedFunction<typeof getFile>;

beforeEach(() => {
  useWorkspaceContextMock.mockImplementation(() => ({
    ...getUseWorkspaceContextReturn,
  }));
  getFileMock.mockImplementation(() => async () => undefined);
});

describe('ImageComponent', () => {
  const globalImage = window.Image;
  beforeEach(() => {
    (window as any).Image = class Image {
      height = 300;
      width = 200;
      onload;
      constructor() {
        setTimeout(() => {
          this.onload();
        }, 15);
      }
    };
    window.URL.createObjectURL = jest.fn((file) => 'blob:' + file.content);
    window.URL.revokeObjectURL = jest.fn();
  });
  afterEach(() => {
    window.Image = globalImage;
  });
  test('first pass renders a 404', async () => {
    const renderResult = render(
      <ImageComponent nodeAttrs={{ src: './google.png', alt: undefined }} />,
    );

    expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <img
          alt="./google.png"
          src="/404.png"
        />
      </div>
    `);
  });

  test('loads the file blob', async () => {
    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        openedWsPaths: OpenedWsPaths.createFromArray(['test-ws:my-file.md']),
      };
    });

    getFileMock.mockImplementation(() => async () => {
      return new File('I am the content of image', 'google.png', {}) as any;
    });

    const renderResult = render(
      <ImageComponent nodeAttrs={{ src: './google.png', alt: undefined }} />,
    );

    const prom = sleep(50);

    // wait for the promise in click to resolve
    await act(() => prom);

    expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <img
          alt="./google.png"
          height="300"
          src="blob:I am the content of image"
          width="200"
        />
      </div>
    `);
  });

  test('handles http urls as image src', async () => {
    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        openedWsPaths: OpenedWsPaths.createFromArray(['test-ws:my-file.md']),
      };
    });

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
          src="https://abcd.google.png"
        />
      </div>
    `);
  });

  test('handles image dimensions that are statically set in the name', async () => {
    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        openedWsPaths: OpenedWsPaths.createFromArray(['test-ws:my-file.md']),
      };
    });

    getFileMock.mockImplementation(() => async () => {
      return new File('I am the content of image', 'google.png', {}) as any;
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
          src="blob:I am the content of image"
          width="4"
        />
      </div>
    `);
  });
});
