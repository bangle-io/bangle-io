import { describe, expect, it } from 'vitest';

import { getWebViewNavigationAction } from '../webview-navigation';

describe('getWebViewNavigationAction', () => {
  const productionUrl = 'https://app.bangle.io';

  it('allows navigation within the configured HTTPS origin', () => {
    expect(
      getWebViewNavigationAction(
        'https://app.bangle.io/notes?view=all#today',
        productionUrl,
      ),
    ).toBe('allow');
    expect(
      getWebViewNavigationAction(
        'https://app.bangle.io:443/notes',
        productionUrl,
      ),
    ).toBe('allow');
  });

  it('externalizes an HTTP downgrade on the configured host', () => {
    expect(
      getWebViewNavigationAction('http://app.bangle.io/notes', productionUrl),
    ).toBe('external');
  });

  it('externalizes a port mismatch on the configured host', () => {
    expect(
      getWebViewNavigationAction(
        'https://app.bangle.io:8443/notes',
        productionUrl,
      ),
    ).toBe('external');
  });

  it('externalizes other HTTPS origins', () => {
    expect(
      getWebViewNavigationAction('https://example.com/notes', productionUrl),
    ).toBe('external');
  });

  it('allows an explicitly configured HTTP LAN origin', () => {
    const lanUrl = 'http://192.168.1.20:5173';

    expect(
      getWebViewNavigationAction('http://192.168.1.20:5173/notes', lanUrl),
    ).toBe('allow');
    expect(
      getWebViewNavigationAction('https://192.168.1.20:5173/notes', lanUrl),
    ).toBe('external');
  });

  it('allows about pages and rejects URLs without an origin', () => {
    expect(getWebViewNavigationAction('about:blank', productionUrl)).toBe(
      'allow',
    );
    expect(
      getWebViewNavigationAction('javascript:alert(1)', productionUrl),
    ).toBe('reject');
  });
});
