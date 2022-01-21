/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import React from 'react';

import { TooltipWrapper } from '../TooltipWrapper';

test('renders correctly', () => {
  let result = render(
    <div>
      <TooltipWrapper>Hello world</TooltipWrapper>
    </div>,
  );

  expect(result.container).toMatchInlineSnapshot(`
    <div>
      <div>
        <div
          class="py-1 px-2 shadow-lg rounded-md ui-bangle-button_tooltip text-sm font-semibold whitespace-nowrap"
        >
          Hello world
        </div>
      </div>
    </div>
  `);
});
