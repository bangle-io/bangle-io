// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';

import { DhanchaWidescreen } from '../index';

describe('DhanchaWidescreen component', () => {
  it('renders correctly and handles resizing', () => {
    const { container } = render(
      <DhanchaWidescreen
        activitybar={<div>Activity Bar</div>}
        leftAside={<div>Left Aside</div>}
        mainContent={<div>Main Content</div>}
        rightAside={<div>Right Aside</div>}
        titlebar={<div>Title Bar</div>}
      />,
    );
    expect(container).toMatchSnapshot();
  });
});
