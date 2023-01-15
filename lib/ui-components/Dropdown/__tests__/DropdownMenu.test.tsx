/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { DropdownMenu, MenuItem, MenuSection } from '../DropdownMenu';

jest.mock('react-dom', () => {
  const otherThings = jest.requireActual('react-dom');

  return {
    ...otherThings,
    createPortal: jest.fn((element, node) => {
      return element;
    }),
  };
});

let result: ReturnType<typeof render>, onAction;
beforeEach(() => {
  onAction = jest.fn();
  result = render(
    <div>
      <DropdownMenu
        menuProps={{
          ariaLabel: 'test-label',
          placement: 'right-start',
        }}
        buttonProps={{
          ariaLabel: '',
          className: 'test-button-class',
          text: 'button child',
        }}
        onAction={onAction}
      >
        <MenuSection aria-label="misc-test">
          <MenuItem aria-label="new note" key="test-k-1">
            New note
          </MenuItem>
          <MenuItem key="c">New workspace</MenuItem>
          <MenuItem key="test-k-3">Switch workspace</MenuItem>
        </MenuSection>
      </DropdownMenu>
    </div>,
  );
});
test('renders correctly', () => {
  expect(result.container).toMatchInlineSnapshot(`
    <div>
      <div>
        <button
          aria-label=""
          aria-pressed="false"
          class="test-button-class text-base h-9 smallscreen:h-10 min-w-10 px-3  select-none inline-flex justify-center items-center rounded-md whitespace-nowrap overflow-hidden py-1 transition-all duration-100 cursor-pointer "
          type="button"
        >
          <span
            class="flex flex-grow-1 overflow-hidden "
            style="justify-content: center;"
          >
            <span
              class="text-ellipsis overflow-hidden "
            >
              button child
            </span>
          </span>
        </button>
      </div>
    </div>
  `);
});

test('button clicks', async () => {
  act(() => {
    fireEvent.click(screen.getByRole('button'));
  });

  let element = await screen.findByLabelText('test-label');

  expect(element).toMatchInlineSnapshot(`
    <ul
      aria-label="test-label"
      class="flex flex-col min-w-72 z-dropdown shadow-md  bg-colorBgLayerFloat border-neutral p-1 py-2 rounded "
      role="menu"
      tabindex="0"
    >
      <li
        role="presentation"
      >
        <ul
          aria-label="misc-test"
          class="p-0 list-outside"
          role="group"
        >
          <li
            aria-disabled="false"
            aria-label="new note"
            class="outline-none cursor-pointer text-sm rounded-md px-2 py-1 "
            data-key="test-k-1"
            role="menuitem"
            tabindex="-1"
          >
            <span
              class="inline-flex justify-between w-full"
            >
              New note
            </span>
          </li>
          <li
            aria-disabled="false"
            class="outline-none cursor-pointer text-sm rounded-md px-2 py-1 "
            data-key="c"
            role="menuitem"
            tabindex="-1"
          >
            <span
              class="inline-flex justify-between w-full"
            >
              New workspace
            </span>
          </li>
          <li
            aria-disabled="false"
            class="outline-none cursor-pointer text-sm rounded-md px-2 py-1 "
            data-key="test-k-3"
            role="menuitem"
            tabindex="-1"
          >
            <span
              class="inline-flex justify-between w-full"
            >
              Switch workspace
            </span>
          </li>
        </ul>
      </li>
    </ul>
  `);
});
