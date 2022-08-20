/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { render } from '@testing-library/react';
import React from 'react';

import { BaseButton } from '../BaseButton';

test('renders correctly', () => {
  let result = render(
    <div>
      <BaseButton
        isQuiet={false}
        styling={{}}
        className={'test-class'}
        isActive={true}
        isDisabled={false}
        isHovered={true}
        isPressed={true}
        onElementReady={() => {}}
        style={{}}
      >
        Hello world
      </BaseButton>
    </div>,
  );

  expect(result.container).toMatchInlineSnapshot(`
    <div>
      <div>
        <button
          class="test-class B-ui-bangle-button_button p-1  transition-all duration-100 BU_is-active is-hovered is-pressed bg-on-hover "
          type="button"
        >
          Hello world
        </button>
      </div>
    </div>
  `);
});
