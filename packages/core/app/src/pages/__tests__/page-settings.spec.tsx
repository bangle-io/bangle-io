// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { renderWithServices } from '@bangle.io/test-utils';
import { screen } from '@testing-library/react';
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { PageSettings, safeAppHref } from '../page-settings';

async function renderSettings(returnTo: string) {
  const testRender = renderWithServices();
  const services = await testRender.autoMountServices();

  act(() => {
    services.navigation.go({
      route: 'settings-general',
      payload: { returnTo },
    });
  });

  testRender.mountComponent({ ui: <PageSettings /> });

  return {
    backLink: screen.getByRole('link', { name: 'Back to app' }),
    services,
  };
}

describe('PageSettings', () => {
  it('handles app-relative routes safely for the desktop custom scheme', () => {
    expect(
      safeAppHref(
        '/ws#route=editor&wsPath=notes%3Aindex.md',
        'bangle://app/#route=settings-general',
      ),
    ).toBe('/ws#route=editor&wsPath=notes%3Aindex.md');
    expect(
      safeAppHref('/\\evil.example/path', 'bangle://app/'),
    ).toBeUndefined();
  });

  it('preserves a valid app-relative return target', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMountServices();
    const returnTo = services.navigation.toUri({
      route: 'editor',
      payload: { wsPath: 'notes:index.md' },
    });

    act(() => {
      services.navigation.go({
        route: 'settings-general',
        payload: { returnTo },
      });
    });

    testRender.mountComponent({ ui: <PageSettings /> });

    expect(screen.getByRole('link', { name: 'Back to app' })).toHaveAttribute(
      'href',
      returnTo,
    );
  });

  it('preserves the path, query, and hash of a valid browser route', async () => {
    const returnTo =
      '/ws?editorEngine=wordgard#route=editor&wsPath=notes%3Aindex.md';
    const { backLink } = await renderSettings(returnTo);

    expect(backLink).toHaveAttribute('href', returnTo);
  });

  it.each([
    ['an absolute URL', 'https://evil.example/path'],
    ['a scheme-relative URL', '//evil.example/path'],
    ['a normalized scheme-relative URL', '/foo/..//evil.example/path'],
    ['a raw-backslash URL', '/\\evil.example/path'],
    ['a control-character URL', '/\nevil.example/path'],
    ['a malformed URL', 'http://[::1'],
  ])('falls back to welcome for %s', async (_label, returnTo) => {
    const { backLink, services } = await renderSettings(returnTo);
    const welcomeHref = services.navigation.toUri({
      route: 'welcome',
      payload: {},
    });

    expect(backLink).toHaveAttribute('href', welcomeHref);
  });
});
