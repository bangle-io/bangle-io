/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { render } from '@testing-library/react';
import React from 'react';

import { MultiColumnMainContent } from '..';
import { Dhancha } from '../Dhancha';

test('renders', () => {
  let result = render(
    <div>
      <Dhancha
        widescreen={true}
        activitybar={<div>Activitybar</div>}
        mainContent={<div>Main content</div>}
        noteSidebar={<div>Note sidebar</div>}
        workspaceSidebar={<div>Workspace sidebar</div>}
      />
    </div>,
  );

  expect(result.container.innerHTML).toContain('Activitybar');
  expect(result.container.innerHTML).toContain('Note sidebar');
  expect(result.container.innerHTML).toContain('Main content');
  expect(result.container.innerHTML).toContain('Workspace sidebar');

  expect(result.container).toMatchSnapshot();
});

test('renders when widescreen=false and there is workspaceSidebar', () => {
  let result = render(
    <div>
      <Dhancha
        widescreen={false}
        activitybar={<div>Activitybar</div>}
        mainContent={<div>Main content</div>}
        noteSidebar={<div>Note sidebar</div>}
        workspaceSidebar={<div>Workspace sidebar</div>}
      />
    </div>,
  );

  expect(result.container.innerHTML).toContain('Activitybar');
  expect(result.container.innerHTML).not.toContain('Note sidebar');
  expect(result.container.innerHTML).not.toContain('Main content');
  expect(result.container.innerHTML).toContain('Workspace sidebar');

  expect(result.container).toMatchSnapshot();
});

test('renders when widescreen=false and there is no workspaceSidebar', () => {
  let result = render(
    <div>
      <Dhancha
        widescreen={false}
        activitybar={<div>Activitybar</div>}
        mainContent={<div>Main content</div>}
        noteSidebar={<div>Note sidebar</div>}
      />
    </div>,
  );

  expect(result.container.innerHTML).toContain('Activitybar');
  expect(result.container.innerHTML).not.toContain('Note sidebar');
  expect(result.container.innerHTML).toContain('Main content');

  expect(result.container).toMatchSnapshot();
});

describe('MultiColumnMainContent', () => {
  test('renders', () => {
    let result = render(
      <div>
        <MultiColumnMainContent>Hello</MultiColumnMainContent>
      </div>,
    );

    expect(result.container).toMatchSnapshot();
  });
});
