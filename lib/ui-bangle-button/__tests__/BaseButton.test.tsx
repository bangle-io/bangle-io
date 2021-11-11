import { render } from '@testing-library/react';
import React from 'react';

import { BaseButton } from '../BaseButton';

test('renders correctly', () => {
  let result = render(
    <div>
      <BaseButton
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
          class="test-class ui-bangle-button_button p-1  transition-all duration-200 is-active is-hovered is-pressed"
        >
          Hello world
        </button>
      </div>
    </div>
  `);
});
