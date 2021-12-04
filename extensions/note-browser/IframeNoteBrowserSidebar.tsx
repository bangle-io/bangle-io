import React, { useCallback, useEffect, useRef } from 'react';

const html = `<!DOCTYPE html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body style="color: white;">
   ${Array.from({ length: 100 }, () => `<div>Nice</div>`)}
  </body>
</html>`;

export function IframeNoteBrowserSidebar() {
  const extensionHtml: Promise<string> = Promise.resolve(html);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const onWrapperIframe = useCallback(
    (wrapperIframe: HTMLIFrameElement) => {
      if (!wrapperIframe.contentDocument) {
        throw new Error('Wrapper iframe not ready');
      }
      const extensionIframeEl =
        wrapperIframe.contentDocument.createElement('iframe');

      const src =
        'data:text/html;base64,' +
        btoa(
          `<script>
          onmessage = (event) => {
            if (event.source === parent.parent && event.origin === "${
              window.location.origin
            }") {
              document.write("<script>" + ${JSON.stringify(
                'document.close()',
              )} + "</" + "script>" + event.data);
            }
          };
          </script>`,
        );

      extensionIframeEl.allow = [
        `camera 'none'`,
        `display-capture 'none'`,
        `microphone 'none'`,
      ].join('; ');

      extensionIframeEl.src = src;
      extensionIframeEl.style.display = 'block';
      extensionIframeEl.style.margin = '0';
      extensionIframeEl.style.border = 'none';
      extensionIframeEl.style.padding = '0';
      extensionIframeEl.style.width = '100%';
      extensionIframeEl.style.height = '100%';

      extensionIframeEl.id = 'bangle-io-extension-iframe';
      extensionIframeEl.title = 'Bangle.io ExtensionIframe';

      wrapperIframe.contentDocument.body.appendChild(extensionIframeEl);

      extensionIframeEl.onload = () => {
        extensionHtml.then((html) => {
          extensionIframeEl.contentWindow?.postMessage(html, '*');
        });
      };
    },
    [extensionHtml],
  );

  useEffect(() => {
    const iframeElement = iframeRef.current;
    return () => {
      const extensionIframeBody = iframeElement?.contentDocument?.body;
      while (extensionIframeBody?.firstChild) {
        extensionIframeBody.removeChild(extensionIframeBody.firstChild);
      }
    };
  }, []);

  return (
    <iframe
      id="bangle-io-wrapper-iframe"
      title="Extension Wrapper"
      ref={iframeRef}
      allow=""
      src="/iframe-wrapper.html"
      frameBorder="0"
      style={{
        height: '100%',
        width: '100%',
        margin: 0,
        padding: 0,
      }}
      onLoad={(arg) => {
        if (arg.target instanceof HTMLIFrameElement) {
          onWrapperIframe(arg.target);
        } else {
          throw new Error('Unable to setup iframe wrapper');
        }
      }}
    />
  );
}
