export const Updater = Symbol('Updater');

export type UpdaterType<TSliceName> = {
  name: TSliceName;
  [Updater]: unknown;
};
