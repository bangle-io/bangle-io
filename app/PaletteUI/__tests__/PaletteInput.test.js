import React, { createRef, useState } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaletteInputUI, PaletteUI } from '../PaletteUI';

describe('PaletteInput', () => {
  let onDismiss, result, onPressEnter;

  beforeEach(async () => {
    onDismiss = jest.fn();
    onPressEnter = jest.fn();

    function Comp() {
      const [query, updateQuery] = useState('');
      const [counter, updateCounter] = useState(1);
      const paletteInputRef = createRef();

      return (
        <div>
          <PaletteInputUI
            ref={paletteInputRef}
            onDismiss={onDismiss}
            onPressEnter={onPressEnter}
            updateCounter={updateCounter}
            updateQuery={updateQuery}
            query={query}
            counter={counter}
          />
          <div data-testid="query-result">{query}</div>
        </div>
      );
    }

    result = await render(<Comp />);
  });

  it('mounts', async () => {
    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div>
          <div
            class="flex mb-2 sticky top-0"
          >
            <input
              aria-label="palette-input"
              class="flex-grow px-2"
              type="text"
              value=""
            />
          </div>
          <div
            data-testid="query-result"
          />
        </div>
      </div>
    `);
  });

  it('typing updates query', async () => {
    const input = result.getByLabelText('palette-input');

    userEvent.type(input, 'Hello, World!');

    expect(input).toMatchInlineSnapshot(`
      <input
        aria-label="palette-input"
        class="flex-grow px-2"
        type="text"
        value="Hello, World!"
      />
    `);
  });

  it('enter works', async () => {
    const input = result.getByLabelText('palette-input');
    userEvent.type(input, 'Hello, {enter}World!');
    expect(onPressEnter).toBeCalledTimes(1);
    expect(onPressEnter).toBeCalledWith({ query: 'Hello, ', counter: 1 });
  });

  it('arrow keys update counter', async () => {
    const input = result.getByLabelText('palette-input');
    userEvent.type(input, 'World {arrowUp}{enter}');
    expect(onPressEnter).toBeCalledTimes(1);
    expect(onPressEnter).toBeCalledWith({ query: 'World ', counter: 0 });

    userEvent.type(input, '{arrowDown}');
    userEvent.type(input, '{arrowDown}');
    userEvent.type(input, '{arrowDown}');
    userEvent.type(input, '{enter}');

    expect(onPressEnter).toBeCalledWith({ query: 'World ', counter: 3 });
  });

  it('escape dismisses', async () => {
    const input = result.getByLabelText('palette-input');

    userEvent.type(input, 'World {escape}');

    expect(onDismiss).toBeCalledTimes(1);
  });
});

describe.only('PaletteUI', () => {
  let updatePalette, parseRawQuery, generateRawQuery;

  beforeEach(async () => {
    updatePalette = jest.fn(() => {});
    parseRawQuery = (currentType, rawQuery) => {
      if (rawQuery.startsWith('>')) {
        return { paletteType: 'command', query: rawQuery.slice(1) };
      }
      return { paletteType: 'default', query: rawQuery.slice(1) };
    };
    generateRawQuery = (paletteType, query) => {
      if (paletteType === 'comand') {
        return '>' + query;
      }
      return query;
    };
  });

  const setup = async ({
    paletteType,
    paletteInitialQuery = '',
    paletteItems,
  }) => {
    const props = {
      paletteType,
      updatePalette,
      paletteInitialQuery,
      parseRawQuery,
      generateRawQuery,
      paletteItems,
    };
    const result = render(<PaletteUI {...props} />);
    const rerender = () => {
      result.rerender(<PaletteUI {...props} />);
    };

    return {
      result,
      rerender,
    };
  };

  test('mounts nothing when palettetype is null', async () => {
    const { result } = await setup({ paletteType: null, paletteItems: [] });
    expect(result.container).toMatchInlineSnapshot(`<div />`);
  });

  test('mounts correctly with paletteType is not null', async () => {
    const { result } = await setup({
      paletteType: 'default',
      paletteItems: [],
    });
    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          class="bangle-palette z-30 p-2 shadow-md border flex flex-col"
        >
          <div
            class="flex mb-2 sticky top-0"
          >
            <input
              aria-label="palette-input"
              class="flex-grow px-2"
              type="text"
              value=""
            />
          </div>
        </div>
      </div>
    `);
  });

  test('renders items correctly', async () => {
    const { result } = await setup({
      paletteType: 'default',
      paletteItems: [
        {
          uid: '1',
          title: 'first item',
          data: {},
          onPressEnter: () => {},
        },
      ],
    });
    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          class="bangle-palette z-30 p-2 shadow-md border flex flex-col"
        >
          <div
            class="flex mb-2 sticky top-0"
          >
            <input
              aria-label="palette-input"
              class="flex-grow px-2"
              type="text"
              value=""
            />
          </div>
          <div
            class="flex side-bar-row flex-row items-center cursor-pointer  active "
            style="padding-left: 16px; padding-right: 16px;"
          >
            <span
              class="text-lg truncate select-none"
            >
              first item
            </span>
            <span
              class="flex-1 flex "
            />
          </div>
        </div>
      </div>
    `);
  });

  test.only('renders items correctly with item is a function', async () => {
    const item = jest.fn(() => ({
      uid: '1',
      title: 'first item',
      data: {},
      onPressEnter: () => {},
    }));
    const { result, rerender } = await setup({
      paletteType: 'default',
      paletteItems: [item],
    });
    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          class="bangle-palette z-30 p-2 shadow-md border flex flex-col"
        >
          <div
            class="flex mb-2 sticky top-0"
          >
            <input
              aria-label="palette-input"
              class="flex-grow px-2"
              type="text"
              value=""
            />
          </div>
          <div
            class="flex side-bar-row flex-row items-center cursor-pointer  active "
            style="padding-left: 16px; padding-right: 16px;"
          >
            <span
              class="text-lg truncate select-none"
            >
              first item
            </span>
            <span
              class="flex-1 flex "
            />
          </div>
        </div>
      </div>
    `);

    expect(item).toHaveBeenNthCalledWith(1, {
      paletteType: 'default',
      query: '',
    });
  });
});
