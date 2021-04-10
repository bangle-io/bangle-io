import React, { createRef, useState } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaletteInputUI, PaletteUI } from '../PaletteUI';

describe('PaletteInput', () => {
  let onDismiss, result, executeHandler;

  beforeEach(async () => {
    onDismiss = jest.fn();
    executeHandler = jest.fn();

    function Comp() {
      const [query, updateQuery] = useState('');
      const [counter, updateCounter] = useState(1);
      const paletteInputRef = createRef();

      return (
        <div>
          <PaletteInputUI
            ref={paletteInputRef}
            onDismiss={onDismiss}
            executeHandler={executeHandler}
            activeItemIndex={0}
            updateCounter={updateCounter}
            updateQuery={updateQuery}
            query={query}
            counter={counter}
          />
          <div data-testid="query-result">{query}</div>
          <div data-testid="query-counter">{counter}</div>
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
            class="palette-input-wrapper flex py-2 px-2 top-0"
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
          <div
            data-testid="query-counter"
          >
            1
          </div>
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
    expect(executeHandler).toBeCalledTimes(1);
    expect(executeHandler).toBeCalledWith(0, expect.any(Object /** Event */));

    const queryResult = result.getByTestId('query-result')?.innerHTML;
    expect(queryResult).toEqual('Hello, World!');
  });

  it('arrow keys update counter', async () => {
    const input = result.getByLabelText('palette-input');
    userEvent.type(input, 'World {arrowUp}{enter}');
    expect(executeHandler).toBeCalledTimes(1);

    userEvent.type(input, '{arrowDown}');
    userEvent.type(input, '{arrowDown}');
    userEvent.type(input, '{arrowDown}');
    userEvent.type(input, '{enter}');
    expect(executeHandler).toBeCalledTimes(2);
    const counter = result.getByTestId('query-counter')?.innerHTML;
    expect(counter).toBe('3');

    const queryResult = result.getByTestId('query-result')?.innerHTML;
    expect(queryResult).toEqual('World ');
  });

  it('escape dismisses', async () => {
    const input = result.getByLabelText('palette-input');

    userEvent.type(input, 'World {escape}');

    expect(onDismiss).toBeCalledTimes(1);
  });
});

describe('PaletteUI', () => {
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
      if (paletteType === 'command') {
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
          class=""
        >
          <div
            class="palette-input-wrapper flex py-2 px-2 top-0"
          >
            <input
              aria-label="palette-input"
              class="flex-grow px-2"
              type="text"
              value=""
            />
          </div>
          <div
            class="overflow-y-auto"
          />
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
          onExecute: () => {},
        },
      ],
    });
    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          class=""
        >
          <div
            class="palette-input-wrapper flex py-2 px-2 top-0"
          >
            <input
              aria-label="palette-input"
              class="flex-grow px-2"
              type="text"
              value=""
            />
          </div>
          <div
            class="overflow-y-auto"
          >
            <div
              class="flex side-bar-row flex-row items-center cursor-pointer active"
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
              <kbd
                class="whitespace-nowrap"
              />
            </div>
          </div>
        </div>
      </div>
    `);
  });

  test('renders items correctly with item is a function', async () => {
    const item = jest.fn(() => ({
      uid: '1',
      title: 'first item',
      data: {},
      onExecute: () => {},
    }));
    const { result, rerender } = await setup({
      paletteType: 'default',
      paletteItems: [item],
    });
    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          class=""
        >
          <div
            class="palette-input-wrapper flex py-2 px-2 top-0"
          >
            <input
              aria-label="palette-input"
              class="flex-grow px-2"
              type="text"
              value=""
            />
          </div>
          <div
            class="overflow-y-auto"
          >
            <div
              class="flex side-bar-row flex-row items-center cursor-pointer active"
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
              <kbd
                class="whitespace-nowrap"
              />
            </div>
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
