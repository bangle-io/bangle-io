import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { NoteSidebarShowButton } from '../NoteSidebarShowButton';

test('renders correctly', async () => {
  let showNoteSidebar = jest.fn();
  let result = render(
    <div>
      <NoteSidebarShowButton
        widescreen={true}
        showNoteSidebar={showNoteSidebar}
        isNoteSidebarShown={false}
      />
    </div>,
  );

  expect(result.container.querySelector('button')).toBeTruthy();

  expect(await result.findAllByLabelText('show note sidebar')).toBeTruthy();
});

test('calls the button', async () => {
  let showNoteSidebar = jest.fn();
  let result = render(
    <div>
      <NoteSidebarShowButton
        widescreen={true}
        showNoteSidebar={showNoteSidebar}
        isNoteSidebarShown={false}
      />
    </div>,
  );

  expect(result.container.querySelector('button')).toBeTruthy();

  fireEvent.click(result.getByLabelText('show note sidebar'));

  expect(showNoteSidebar).toBeCalledTimes(1);
});

test('hides in mobile view', async () => {
  let showNoteSidebar = jest.fn();
  let result = render(
    <div>
      <NoteSidebarShowButton
        widescreen={false}
        showNoteSidebar={showNoteSidebar}
        isNoteSidebarShown={false}
      />
    </div>,
  );

  expect(result.container.querySelector('button')).toBe(null);
});

test('hides when sidebar is shown', async () => {
  let showNoteSidebar = jest.fn();
  let result = render(
    <div>
      <NoteSidebarShowButton
        widescreen
        showNoteSidebar={showNoteSidebar}
        isNoteSidebarShown={true}
      />
    </div>,
  );

  expect(result.container.querySelector('button')).toBe(null);
});
