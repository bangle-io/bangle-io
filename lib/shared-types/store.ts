import type { History } from '@bangle.io/ws-path';

export type BangleStateOpts = {
  lifecycle: any;
};

export type OnNativefsAuthErrorType = (
  wsName: string | undefined,
  history: History,
) => void;

export type OnWorkspaceNotFoundType = (
  wsName: string | undefined,
  history: History,
) => void;

export type OnInvalidPathType = (
  wsName: string | undefined,
  history: History,
  invalidPath: string,
) => void;

export type HistoryAction =
  | {
      name: 'action::page-slice:history-auth-error';
      value: {
        wsName: string;
      };
    }
  | {
      name: 'action::page-slice:history-ws-not-found';
      value: {
        wsName: string;
      };
    }
  | {
      name: 'action::page-slice:history-on-invalid-path';
      value: {
        wsName: string;
        invalidPath: string;
      };
    }
  | {
      name: 'action::page-slice:history-set-history';
      value: {
        history: History;
      };
    }
  | {
      name: 'action::page-slice:history-update-opened-ws-paths';
      value: {
        openedWsPathsArray: (string | null)[];
        replace: boolean;
        wsName: string;
      };
    }
  | {
      name: 'action::page-slice:history-go-to-path';
      value: {
        pathname: string;
      };
    };
