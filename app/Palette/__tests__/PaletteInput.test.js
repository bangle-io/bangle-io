import React, { createRef, useState } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaletteInput } from '../PaletteInput';

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
          <PaletteInput
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
