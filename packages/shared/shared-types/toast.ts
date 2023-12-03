export type ToastRequest = {
  type: 'neutral' | 'positive' | 'negative' | 'info';
  label: string;
  id?: string;
  timeout?: number;
};

export type ToastRequestClear = {
  id: string;
};
