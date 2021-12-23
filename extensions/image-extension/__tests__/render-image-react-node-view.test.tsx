import { act, render } from '@testing-library/react';
import React from 'react';

import { getUseWorkspaceContextReturn } from '@bangle.io/test-utils/function-mock-return';
import { sleep } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { FileOps } from '@bangle.io/workspaces';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { ImageComponent } from '../render-image-react-node-view';

jest.mock('@bangle.io/workspace-context', () => {
  const other = jest.requireActual('@bangle.io/workspace-context');

  return {
    ...other,
    useWorkspaceContext: jest.fn(),
  };
});

jest.mock('@bangle.io/workspaces', () => {
  const workspaceThings = jest.requireActual('@bangle.io/workspaces');
  return {
    ...workspaceThings,
    FileOps: {
      getFile: jest.fn(),
    },
  };
});

class File {
  constructor(public content, public fileName, public opts) {}
}

let useWorkspaceContextMock = useWorkspaceContext as jest.MockedFunction<
  typeof useWorkspaceContext
>;

beforeEach(() => {
  useWorkspaceContextMock.mockImplementation(() => ({
    ...getUseWorkspaceContextReturn,
  }));
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
          loading="lazy"
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

    (FileOps.getFile as any).mockImplementation(async () => {
      return new File('I am the content of image', 'google.png', {});
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
          loading="lazy"
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
          loading="lazy"
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

    (FileOps.getFile as any).mockImplementation(async () => {
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
