export type ActionSnapshot<P = unknown> = {
  sliceKey: string;
  actionName: string;
  payload: P;
};
