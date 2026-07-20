type WebViewNavigationAction = 'allow' | 'external' | 'reject';

const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
};

function getWebOrigin(url: string): string | undefined {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]+)/i.exec(url);
  if (!match) {
    return undefined;
  }

  const [, rawProtocol, rawAuthority] = match;
  if (!rawProtocol || !rawAuthority) {
    return undefined;
  }

  const protocol = `${rawProtocol.toLowerCase()}:`;
  const authority = rawAuthority.slice(rawAuthority.lastIndexOf('@') + 1);
  const portSeparator = authority.lastIndexOf(':');
  const hasPort =
    !authority.startsWith('[') && portSeparator > -1
      ? portSeparator > 0
      : authority.endsWith(']') === false && portSeparator > -1;
  const host = hasPort ? authority.slice(0, portSeparator) : authority;
  const port = hasPort ? authority.slice(portSeparator + 1) : undefined;

  if (!host || (port !== undefined && !/^\d+$/.test(port))) {
    return undefined;
  }

  const effectivePort = port
    ? String(Number(port))
    : (DEFAULT_PORTS[protocol] ?? '');
  return `${protocol}//${host.toLowerCase()}:${effectivePort}`;
}

export function getWebViewNavigationAction(
  requestUrl: string,
  configuredWebUrl: string,
): WebViewNavigationAction {
  if (requestUrl.startsWith('about:')) {
    return 'allow';
  }

  const configuredOrigin = getWebOrigin(configuredWebUrl);
  const requestOrigin = getWebOrigin(requestUrl);
  if (configuredOrigin && requestOrigin === configuredOrigin) {
    return 'allow';
  }

  return requestOrigin ? 'external' : 'reject';
}
