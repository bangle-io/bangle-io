import React, { useCallback, useEffect, useState } from 'react';

export function ExtensionIframe({
  extensionHtml,
}: {
  extensionHtml: Promise<string>;
}) {
  const [divElement, setDivElement] = useState<HTMLDivElement | null>(null);

  const wrapperIframe = useCreateIframe({
    parentElement: divElement,
    contentDocument: document,
    allow: '',
    id: 'bangle-io-wrapper-iframe',
    src: '/iframe-wrapper.html',
    title: 'Extension wrapper',
  });

  const extensionIframe = useCreateIframe({
    parentElement: wrapperIframe?.contentDocument?.body,
    contentDocument: wrapperIframe?.contentDocument,
    allow: [
      `camera 'none'`,
      `display-capture 'none'`,
      `microphone 'none'`,
    ].join('; '),
    id: 'bangle-io-extension-iframe',
    src: getExtensionIframeSource(),
    title: 'Extension Iframe',
  });

  useEffect(() => {
    if (extensionIframe) {
      extensionHtml.then((html) => {
        extensionIframe.contentWindow?.postMessage(html, '*');
      });
    }
  }, [extensionIframe, extensionHtml]);

  const onMessage = useCallback(
    (event: WindowEventMap['message']) => {
      console.debug('received message');
      if (event.source && event.source === wrapperIframe?.contentWindow) {
        console.debug('received message from wrapper');
      }
      if (event.source && extensionIframe?.contentWindow === event.source) {
        console.debug('received message from extension !!');
      }
    },
    [wrapperIframe, extensionIframe],
  );

  useEffect(() => {
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [onMessage]);

  useEffect(() => {
    const channel = new MessageChannel();
    if (extensionIframe) {
      setTimeout(() => {
        console.log('sending message');
        (window.Wworker as Worker).postMessage('iframe-setup', [channel.port1]);
        extensionIframe?.contentWindow.postMessage('message-channel', '*', [
          channel.port2,
        ]);
        channel.port1.postMessage('hello');
      }, 500);
    }
    // sendingWorker.postMessage({ port: channel.port2 }, [channel.port2]);
  }, [extensionIframe]);

  return <div className="w-full h-full" ref={setDivElement}></div>;
}

function useCreateIframe({
  parentElement,
  contentDocument,
  id,
  title,
  allow,
  src,
}: {
  parentElement?: Element | null;
  contentDocument?: Document | null;
  id: string;
  title: string;
  allow: string;
  src: string;
}) {
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null);

  // mount wrapper iframe
  useEffect(() => {
    let frame: HTMLIFrameElement | null = null;
    if (parentElement && contentDocument) {
      frame = createIframe({
        contentDocument: contentDocument,
        allow,
        id,
        src,
        title,
        onReady: (el) => {
          setIframeEl(el);
        },
      });
      parentElement.appendChild(frame);
    }
    return () => {
      if (frame) {
        parentElement?.removeChild(frame);
      }
    };
  }, [allow, id, src, title, contentDocument, parentElement]);

  return iframeEl;
}

function createIframe({
  contentDocument,
  id,
  title,
  allow,
  src,
  onReady,
}: {
  contentDocument: Document;
  id: string;
  title: string;
  allow: string;
  src: string;
  onReady: (element: HTMLIFrameElement) => void;
}) {
  const iframeEl = contentDocument.createElement('iframe');
  iframeEl.src = src;
  iframeEl.style.display = 'block';
  iframeEl.style.margin = '0';
  iframeEl.style.border = 'none';
  iframeEl.style.padding = '0';
  iframeEl.style.width = '100%';
  iframeEl.style.height = '100%';

  iframeEl.id = id;
  iframeEl.title = title;
  iframeEl.allow = allow;
  iframeEl.onload = () => {
    onReady(iframeEl);
  };
  return iframeEl;
}

function getExtensionIframeSource() {
  const innerJS = `\ndocument.close();\nconsole.log('preparing extension iframe');`;

  const result =
    'data:text/html;base64,' +
    btoa(
      `
<script>
    onmessage = (event) => {
        if (event.source === parent.parent && event.origin === "${
          window.location.origin
        }") {
            document.write("<script>" + ${JSON.stringify(
              innerJS,
            )} + "</" + "script>" + event.data);
        }
    }
</script>`.trim(),
    );

  return result;
}
