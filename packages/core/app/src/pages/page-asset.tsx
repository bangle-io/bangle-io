import { useCoreServices } from '@bangle.io/context';
import { buttonVariants } from '@bangle.io/ui-components';
import {
  type AssetPreviewKind,
  getAssetPreviewKind,
  WsPath,
} from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import { Download } from 'lucide-react';
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
      textContent?: string;
    }
  | { status: 'missing'; fileName: string }
  | { status: 'error'; fileName: string };

export function PageAsset() {
  const { fileSystem, navigation, workspaceState } = useCoreServices();
  const routeInfo = useAtomValue(navigation.$routeInfo);
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

  React.useEffect(() => {
    if (!wsPath) {
      setState({ status: 'error', fileName });
      return;
    }

    let objectUrl: string | undefined;
    let disposed = false;
    setState({ status: 'loading' });

    void (async () => {
      try {
        const file = await fileSystem.readFile(wsPath);
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
            textContent = await file.text();
            if (disposed) {
              return;
            }
          } else {
            // Too large to render as a single string; offer download instead.
            kind = undefined;
          }
        }

        objectUrl = URL.createObjectURL(file);
        setState({ status: 'ready', fileName, objectUrl, kind, textContent });
      } catch {
        if (!disposed) {
          setState({ status: 'error', fileName });
        }
      }
    })();

    return () => {
      disposed = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileName, fileSystem, wsPath]);

  if (!currentWsName) {
    return (
      <>
        <AppHeader />
        <PageContentContainer>
          <ContentSection hasPadding>
            <WorkspaceNotFoundView wsName={navigation.resolveAtoms().wsName} />
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
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <h1
            className="wrap-anywhere min-w-0 flex-1 font-semibold text-lg"
            title={fileName}
          >
            {fileName}
          </h1>
          {state.status === 'ready' ? (
            <a
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              download={state.fileName}
              href={state.objectUrl}
            >
              <Download />
              {t.app.pageAsset.downloadButton}
            </a>
          ) : null}
        </div>
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-4">
          <AssetBody state={state} />
        </div>
      </PageContentContainer>
    </>
  );
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
