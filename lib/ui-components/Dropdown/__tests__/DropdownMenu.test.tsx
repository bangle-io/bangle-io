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
        menuPlacement="right-start"
        ariaLabel="test-label"
        buttonAriaLabel=""
        buttonStyling={{
          activeColor: 'test-active-color',
        }}
        buttonClassName="test-button-class"
        buttonChildren={<span>button child</span>}
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
          class="test-button-class B-ui-components_dropdown-button p-1  transition-all duration-100 "
          type="button"
        >
          <span>
            button child
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
      class="flex flex-col min-w-72 B-ui-components_dropdown-dropdown-menu bg-colorBgLayerFloat border-1 border-colorNeutralBorder B-ui-components_misc-dropdown-shadow p-1 py-2 rounded-md "
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
            class="B-ui-components_dropdown-dropdown-menu-item outline-none cursor-pointer text-sm rounded-md px-2 py-1 "
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
            class="B-ui-components_dropdown-dropdown-menu-item outline-none cursor-pointer text-sm rounded-md px-2 py-1 "
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
            class="B-ui-components_dropdown-dropdown-menu-item outline-none cursor-pointer text-sm rounded-md px-2 py-1 "
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
