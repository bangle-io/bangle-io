/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import { sleep } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { ImageComponentInner } from '../render-image-react-node-view';

class File {
  constructor(public content: any, public fileName: any, public opts: any) {}
}

describe('ImageComponent', () => {
  const globalImage = window.Image;
  beforeEach(() => {
    (window as any).Image = class Image {
      height = 300;
      width = 200;
      onload = () => {};
      constructor() {
        setTimeout(() => {
          this.onload();
        }, 15);
      }
    };
    window.URL.createObjectURL = jest.fn((file: any) => 'blob:' + file.content);
    window.URL.revokeObjectURL = jest.fn();
  });
  afterEach(() => {
    window.Image = globalImage;
  });
  test('first pass renders a 404', async () => {
    const renderResult = render(
      <ImageComponentInner
        nodeAttrs={{ src: './google.png', alt: undefined }}
        openedWsPaths={OpenedWsPaths.createFromArray([])}
        readFile={async () => undefined}
      />,
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
    const renderResult = render(
      <ImageComponentInner
        nodeAttrs={{ src: './google.png', alt: undefined }}
        openedWsPaths={OpenedWsPaths.createFromArray(['test-ws:my-file.md'])}
        readFile={async () =>
          new File('I am the content of image', 'google.png', {}) as any
        }
      />,
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
    const renderResult = render(
      <ImageComponentInner
        nodeAttrs={{
          src: 'https://abcd.google.png',
          alt: undefined,
        }}
        readFile={async () => undefined}
        openedWsPaths={OpenedWsPaths.createFromArray(['test-ws:my-file.md'])}
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
    const renderResult = render(
      <ImageComponentInner
        nodeAttrs={{
          src: 'google-4x3.png',
          alt: undefined,
        }}
        readFile={async () => {
          return new File('I am the content of image', 'google.png', {}) as any;
        }}
        openedWsPaths={OpenedWsPaths.createFromArray(['test-ws:my-file.md'])}
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
