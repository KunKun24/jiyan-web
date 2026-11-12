import { reactive } from 'vue';

export type ToastKind = 'info' | 'success' | 'error';

export interface ToastItem {
  id: number;
  text: string;
  kind: ToastKind;
}

export const toasts = reactive<ToastItem[]>([]);
let seq = 0;

export function toast(text: string, kind: ToastKind = 'info', ms = 2600): void {
  const id = ++seq;
  toasts.push({ id, text, kind });
  window.setTimeout(() => {
    const index = toasts.findIndex((item) => item.id === id);
    if (index >= 0) toasts.splice(index, 1);
  }, ms);
}
