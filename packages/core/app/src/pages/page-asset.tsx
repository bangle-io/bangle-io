import { useCoreServices } from '@bangle.io/context';
import { Button } from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import { Download } from 'lucide-react';
import React from 'react';
import { ContentSection } from '../components/common/content-section';
import { PageHeader } from '../components/common/page-header';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

type AssetState =
  | { status: 'loading' }
  | { status: 'ready'; fileName: string; objectUrl: string }
  | { status: 'missing'; fileName: string }
  | { status: 'error'; fileName: string };

export function PageAsset() {
  const { fileSystem, navigation } = useCoreServices();
  const routeInfo = useAtomValue(navigation.$routeInfo);
  const wsPath =
    routeInfo.route === 'asset' ? routeInfo.payload.wsPath : undefined;
  const fileName = wsPath
    ? (WsPath.safeParseFile(wsPath).data?.fileName ?? t.app.common.unknown)
    : t.app.common.unknown;
  const [state, setState] = React.useState<AssetState>({ status: 'loading' });

  React.useEffect(() => {
    if (!wsPath) {
      setState({ status: 'error', fileName });
      return;
    }

    let objectUrl: string | undefined;
    let disposed = false;
    setState({ status: 'loading' });

    void fileSystem
      .readFile(wsPath)
      .then((file) => {
        if (disposed) {
          return;
        }
        if (!file) {
          setState({ status: 'missing', fileName });
          return;
        }
        objectUrl = URL.createObjectURL(file);
        setState({ status: 'ready', fileName, objectUrl });
      })
      .catch(() => {
        if (!disposed) {
          setState({ status: 'error', fileName });
        }
      });

    return () => {
      disposed = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileName, fileSystem, wsPath]);

  return (
    <>
      <AppHeader />
      <PageContentContainer>
        <ContentSection hasPadding>
          <PageHeader title={fileName} />
          {state.status === 'ready' ? (
            <Button asChild>
              <a download={state.fileName} href={state.objectUrl}>
                <Download className="h-4 w-4" />
                {t.app.pageAsset.downloadButton}
              </a>
            </Button>
          ) : (
            <p className="max-w-md text-muted-foreground text-sm">
              {state.status === 'loading'
                ? t.app.pageAsset.loading
                : t.app.pageAsset.unavailable}
            </p>
          )}
        </ContentSection>
      </PageContentContainer>
    </>
  );
}
