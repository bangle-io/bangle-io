export interface BaseHistory {
  readonly pathname: string | undefined;

  readonly search: string | undefined;

  destroy: () => void;

  navigate: (to: string, obj?: { replace?: boolean }) => void;
}
