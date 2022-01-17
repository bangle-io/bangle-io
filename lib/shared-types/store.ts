import { ApplicationStore } from '@bangle.io/create-store';

export type BangleStateConfig = {
  readonly extensionRegistry: any;
  readonly useWebWorker: boolean;
  readonly saveState: (store: ApplicationStore) => void;
};
