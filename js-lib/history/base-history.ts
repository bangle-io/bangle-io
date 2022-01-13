import { Location } from './types';

export abstract class BaseHistory {
  constructor(
    protected base = '',
    protected onChange: (location: Location) => void,
  ) {}

  public abstract readonly pathname: string | undefined;

  public abstract readonly search: string | undefined;

  public abstract destroy(): void;

  public abstract navigate(to: string, obj?: { replace?: boolean }): void;
}
