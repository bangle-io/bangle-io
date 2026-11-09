import { useCoreServices } from '@bangle.io/context';
import { buttonVariants } from '@bangle.io/ui-components';
import {
  type AssetPreviewKind,
  getAssetPreviewKind,
  WsPath,
} from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import { Download, ExternalLink } from 'lucide-react';
import React from 'react';
import { AssetPreview } from '../components/common/asset-preview';
import { ContentSection } from '../components/common/content-section';
import { FileNotFoundView } from '../components/feedback/file-not-found-view';
import { WorkspaceNotFoundView } from '../components/feedback/workspace-not-found-view';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

// Cap inline text previews so a huge log or data dump does not get pulled into
// memory as one string; larger files fall back to the download affordance.
const TEXT_PREVIEW_MAX_BYTES = 2 * 1024 * 1024;

type AssetState =
  | { status: 'loading' }
  | {
      status: 'ready';
      fileName: string;
      objectUrl: string;
      kind: AssetPreviewKind | undefined;
      shareFile?: File;
      textContent?: string;
    }
  | { status: 'missing'; fileName: string }
  | { status: 'error'; fileName: string };

export function PageAsset() {
  const { fileSystem, navigation, workspaceState } = useCoreServices();
  const routeInfo = useAtomValue(navigation.$routeInfo);
  const routeWsName = useAtomValue(navigation.$wsName);
  const currentWsName = useAtomValue(workspaceState.$currentWsName);
  const currentWsFilePath = useAtomValue(workspaceState.$currentWsFilePath);
  const routeFilePath =
    routeInfo.route === 'asset'
      ? WsPath.safeParseFile(routeInfo.payload.wsPath).data
      : undefined;
  const wsPath = currentWsFilePath?.wsPath;
  const fileName =
    currentWsFilePath?.fileName ??
    routeFilePath?.fileName ??
    t.app.common.unknown;
  const [state, setState] = React.useState<AssetState>({ status: 'loading' });
  const [shareFailed, setShareFailed] = React.useState(false);

  React.useEffect(() => {
    setShareFailed(false);
    if (!wsPath) {
      setState({ status: 'error', fileName });
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | undefined;
    let disposed = false;
    setState({ status: 'loading' });

    void (async () => {
      try {
        const file = await fileSystem.readFile(wsPath, {
          signal: controller.signal,
        });
        if (disposed) {
          return;
        }
        if (!file) {
          setState({ status: 'missing', fileName });
          return;
        }

        let kind = getAssetPreviewKind(wsPath);
        let textContent: string | undefined;
        if (kind === 'text') {
          if (file.size <= TEXT_PREVIEW_MAX_BYTES) {
            const decoded = await file.text();
            if (disposed) {
              return;
            }
            if (decoded.includes('\u0000')) {
              // A NUL byte means the bytes are not really text (a binary file
              // misnamed with a text extension); fall back to download rather
              // than render replacement-character mojibake.
              kind = undefined;
            } else {
              textContent = decoded;
            }
          } else {
            // Too large to render as a single string; offer download instead.
            kind = undefined;
          }
        }

        // Serve PDFs under an explicit application/pdf type. A stored file can
        // carry an attacker-controlled MIME type (e.g. a text/html file dragged
        // in from another page and saved as ".pdf"); since a blob: URL inherits
        // the app origin, letting the iframe honor that type would execute
        // same-origin script. The other kinds render in inert sinks
        // (img/video/audio) or as escaped text, so their bytes are used as-is.
        const previewSource =
          kind === 'pdf' ? new Blob([file], { type: 'application/pdf' }) : file;
        objectUrl = URL.createObjectURL(previewSource);
        const candidateShareFile = createShareFile(file, fileName, kind);
        const shareFile = canShareFile(candidateShareFile)
          ? candidateShareFile
          : undefined;
        setState({
          status: 'ready',
          fileName,
          objectUrl,
          kind,
          shareFile,
          textContent,
        });
      } catch {
        if (!disposed) {
          setState({ status: 'error', fileName });
        }
      }
    })();

    return () => {
      disposed = true;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileName, fileSystem, wsPath]);

  const handleShare = () => {
    if (
      state.status !== 'ready' ||
      !state.shareFile ||
      typeof navigator.share !== 'function'
    ) {
      return;
    }

    setShareFailed(false);
    void navigator
      .share({
        files: [state.shareFile],
        title: state.fileName,
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setShareFailed(true);
        }
      });
  };

  if (!currentWsName) {
    return (
      <>
        <AppHeader />
        <PageContentContainer>
          <ContentSection hasPadding>
            <WorkspaceNotFoundView wsName={routeWsName} />
          </ContentSection>
        </PageContentContainer>
      </>
    );
  }

  if (!currentWsFilePath) {
    return (
      <>
        <AppHeader />
        <PageContentContainer>
          <ContentSection hasPadding>
            <FileNotFoundView />
          </ContentSection>
        </PageContentContainer>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <PageContentContainer>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1
            className="wrap-anywhere min-w-0 font-semibold text-lg sm:flex-1"
            title={fileName}
          >
            {fileName}
          </h1>
          {state.status === 'ready' ? (
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              {state.shareFile ? (
                <button
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                  })}
                  onClick={handleShare}
                  type="button"
                >
                  <ExternalLink />
                  {t.app.pageAsset.openExternallyButton}
                </button>
              ) : null}
              <a
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                download={state.fileName}
                href={state.objectUrl}
              >
                <Download />
                {t.app.pageAsset.downloadButton}
              </a>
            </div>
          ) : null}
        </div>
        {shareFailed ? (
          <p className="text-destructive text-sm" role="alert">
            {t.app.pageAsset.openExternallyFailed}
          </p>
        ) : null}
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-4">
          <AssetBody state={state} />
        </div>
      </PageContentContainer>
    </>
  );
}

function createShareFile(
  file: File,
  fileName: string,
  kind: AssetPreviewKind | undefined,
): File {
  // Android chooses receiving apps from the MIME type. Stored PDFs can carry a
  // missing or untrusted type, so match the safe type used by the PDF preview.
  const type = kind === 'pdf' ? 'application/pdf' : file.type;
  if (file.name === fileName && file.type === type) {
    return file;
  }

  return new File([file], fileName, {
    lastModified: file.lastModified,
    type,
  });
}

function canShareFile(file: File): boolean {
  if (
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function'
  ) {
    return false;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function AssetBody({ state }: { state: AssetState }) {
  if (state.status === 'loading') {
    return (
      <p className="max-w-md text-muted-foreground text-sm">
        {t.app.pageAsset.loading}
      </p>
    );
  }

  if (state.status === 'missing' || state.status === 'error') {
    return (
      <p className="max-w-md text-muted-foreground text-sm">
        {t.app.pageAsset.unavailable}
      </p>
    );
  }

  if (!state.kind) {
    return (
      <p className="max-w-md text-muted-foreground text-sm">
        {t.app.pageAsset.noPreview}
      </p>
    );
  }

  return (
    <AssetPreview
      key={state.objectUrl}
      kind={state.kind}
      objectUrl={state.objectUrl}
      fileName={state.fileName}
      textContent={state.textContent}
    />
  );
}
