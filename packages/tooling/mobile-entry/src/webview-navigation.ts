type WebViewNavigationAction = 'allow' | 'external' | 'reject';

const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
};

function getWebOrigin(url: string): string | undefined {
  // Hermes does not provide a reliable WHATWG URL implementation. Keep this
  // parser deliberately narrower than browser URL syntax so ambiguous input
  // is rejected instead of being interpreted differently by the WebView.
  if (url.includes('\\')) {
    return undefined;
  }

  const match = /^(https?):\/\/([^/?#]+)(?:[/?#]|$)/i.exec(url);
  if (!match) {
    return undefined;
  }

  const [, rawProtocol, rawAuthority] = match;
  if (!rawProtocol || !rawAuthority) {
    return undefined;
  }

  if (rawAuthority.includes('@')) {
    return undefined;
  }

  const protocol = `${rawProtocol.toLowerCase()}:`;
  const authorityMatch = rawAuthority.startsWith('[')
    ? /^(\[[0-9a-f:.]+\])(?::(\d+))?$/i.exec(rawAuthority)
    : /^([a-z0-9.-]+)(?::(\d+))?$/i.exec(rawAuthority);
  const host = authorityMatch?.[1];
  const port = authorityMatch?.[2];

  if (!host) {
    return undefined;
  }

  const numericPort = port === undefined ? undefined : Number(port);
  if (
    numericPort !== undefined &&
    (!Number.isInteger(numericPort) || numericPort > 65_535)
  ) {
    return undefined;
  }

  const effectivePort =
    numericPort === undefined
      ? (DEFAULT_PORTS[protocol] ?? '')
      : String(numericPort);
  return `${protocol}//${host.toLowerCase()}:${effectivePort}`;
}

export function getWebViewNavigationAction(
  requestUrl: string,
  configuredWebUrl: string,
): WebViewNavigationAction {
  if (/^about:blank(?:[?#].*)?$/.test(requestUrl)) {
    return 'allow';
  }

  const configuredOrigin = getWebOrigin(configuredWebUrl);
  const requestOrigin = getWebOrigin(requestUrl);
  if (configuredOrigin && requestOrigin === configuredOrigin) {
    return 'allow';
  }

  return requestOrigin ? 'external' : 'reject';
}
