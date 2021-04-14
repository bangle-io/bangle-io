import React, { createRef, useState } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaletteUI } from '../PaletteUI';

describe('PaletteUI', () => {
  let dismissPalette, result;
  let Comp;
  const sampleItemOne = {
    uid: 'item-one',
    title: 'I am a title',
    keybinding: 'Ctrl-a',
    onExecute: jest.fn(),
  };

  const sampleItemTwo = {
    uid: 'item-two',
    title: 'I am second item',
    keybinding: 'Ctrl-a',
    onExecute: jest.fn(),
  };

  beforeEach(async () => {
    dismissPalette = jest.fn();
    sampleItemOne.onExecute = jest.fn();
    sampleItemTwo.onExecute = jest.fn();

    Comp = function Comp({ placeholder, items, initialValue = '' }) {
      const [value, updateValue] = useState(initialValue);

      return (
        <div>
          <PaletteUI
            placeholder={placeholder}
            dismissPalette={dismissPalette}
            value={value}
            updateValue={updateValue}
            items={items}
          />
          <div data-testid="query-result">{value}</div>
        </div>
      );
    };
  });

  it('mounts', async () => {
    result = await render(<Comp items={[sampleItemOne]} initialValue="hola" />);

    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div>
          <div>
            <div
              class="palette-input-wrapper flex py-2 px-2 top-0"
            >
              <input
                aria-label="palette-input"
                autocapitalize="off"
                autocorrect="off"
                class="flex-grow px-2"
                spellcheck="false"
                type="text"
                value="hola"
              />
            </div>
            <div
              class="overflow-y-auto"
            >
              <div
                class="flex side-bar-row flex-row items-center cursor-pointer active hover-allowed"
                style="padding-left: 16px; padding-right: 16px;"
              >
                <span
                  class="text-lg truncate select-none"
                >
                  I am a title
                </span>
                <span
                  class="flex-1 flex "
                />
                <kbd
                  class="whitespace-nowrap"
                >
                  Ctrl-a
                </kbd>
              </div>
            </div>
          </div>
          <div
            data-testid="query-result"
          >
            hola
          </div>
        </div>
      </div>
    `);
  });

  it('typing updates query', async () => {
    result = await render(<Comp items={[]} />);

    const input = result.getByLabelText('palette-input');

    userEvent.type(input, 'Hello, World!');

    expect(input).toMatchInlineSnapshot(`
      <input
        aria-label="palette-input"
        autocapitalize="off"
        autocorrect="off"
        class="flex-grow px-2"
        spellcheck="false"
        type="text"
        value="Hello, World!"
      />
    `);
  });

  it('enter works', async () => {
    result = await render(<Comp items={[sampleItemOne]} />);

    const input = result.getByLabelText('palette-input');
    userEvent.type(input, 'Hello, {enter}World!');
    expect(sampleItemOne.onExecute).toBeCalledTimes(1);
    expect(sampleItemOne.onExecute).toHaveBeenNthCalledWith(
      1,
      sampleItemOne,
      0,
      expect.any(Object /** Event */),
    );

    const queryResult = result.getByTestId('query-result')?.innerHTML;
    expect(queryResult).toEqual('Hello, World!');
  });

  it('arrow keys update counter', async () => {
    result = await render(<Comp items={[sampleItemOne, sampleItemTwo]} />);

    const input = result.getByLabelText('palette-input');
    userEvent.type(input, 'World {arrowUp}{enter}');
    expect(sampleItemOne.onExecute).toBeCalledTimes(0);
    expect(sampleItemTwo.onExecute).toBeCalledTimes(1);

    userEvent.type(input, '{arrowDown}');
    userEvent.type(input, '{enter}');
    expect(sampleItemOne.onExecute).toBeCalledTimes(1);

    const queryResult = result.getByTestId('query-result')?.innerHTML;
    expect(queryResult).toEqual('World ');
  });

  it('escape dismisses', async () => {
    result = await render(<Comp items={[sampleItemOne]} />);

    const input = result.getByLabelText('palette-input');

    userEvent.type(input, 'World {escape}');

    expect(dismissPalette).toBeCalledTimes(1);
  });
});
