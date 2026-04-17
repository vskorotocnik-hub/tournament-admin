/**
 * Global toast bus — frame-agnostic pub/sub so `toast.error(msg)` can be
 * called from anywhere (event handlers, utilities, async code) without hooks.
 *
 * Usage:
 *   import { toast } from '../lib/toast';
 *   toast.success('Сохранено');
 *   toast.error('Ошибка сети');
 *   toast.info('Что-то информационное');
 */

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  /** milliseconds; 0 = stays until user dismisses */
  duration: number;
}

type Listener = (item: ToastItem) => void;

let seq = 1;
const listeners = new Set<Listener>();

export const toastBus = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit(kind: ToastKind, message: string, duration?: number) {
    const item: ToastItem = {
      id: seq++,
      kind,
      message,
      duration: duration ?? (kind === 'error' ? 6000 : 3500),
    };
    listeners.forEach(l => l(item));
  },
};

export const toast = {
  success: (msg: string, durationMs?: number) => toastBus.emit('success', msg, durationMs),
  error: (msg: string, durationMs?: number) => toastBus.emit('error', msg, durationMs),
  info: (msg: string, durationMs?: number) => toastBus.emit('info', msg, durationMs),
  warning: (msg: string, durationMs?: number) => toastBus.emit('warning', msg, durationMs),
};
