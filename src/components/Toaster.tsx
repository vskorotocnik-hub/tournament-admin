/**
 * <Toaster /> — mount once near the root. Subscribes to toastBus and renders
 * stacked toasts in the bottom-right corner. Zero dependencies.
 */
import { useEffect, useState, useCallback } from 'react';
import { toastBus, type ToastItem } from '../lib/toast';

const KIND_STYLES: Record<ToastItem['kind'], { bg: string; border: string; icon: string; iconColor: string }> = {
  success: { bg: 'bg-emerald-950/95', border: 'border-emerald-500/40', icon: '✅', iconColor: 'text-emerald-400' },
  error:   { bg: 'bg-red-950/95',     border: 'border-red-500/40',     icon: '⛔', iconColor: 'text-red-400' },
  warning: { bg: 'bg-amber-950/95',   border: 'border-amber-500/40',   icon: '⚠️', iconColor: 'text-amber-400' },
  info:    { bg: 'bg-zinc-900/95',    border: 'border-zinc-600/40',    icon: 'ℹ️', iconColor: 'text-sky-400' },
};

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  useEffect(() => {
    return toastBus.subscribe(item => {
      setItems(prev => [...prev, item]);
      if (item.duration > 0) {
        window.setTimeout(() => dismiss(item.id), item.duration);
      }
    });
  }, [dismiss]);

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-[min(92vw,380px)] pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {items.map(item => {
        const s = KIND_STYLES[item.kind];
        return (
          <div
            key={item.id}
            className={`pointer-events-auto ${s.bg} ${s.border} border backdrop-blur-md rounded-xl px-4 py-3 shadow-2xl flex items-start gap-3 animate-[slideIn_200ms_ease-out]`}
            role={item.kind === 'error' ? 'alert' : 'status'}
          >
            <span className={`text-lg leading-none ${s.iconColor} shrink-0 pt-0.5`}>{s.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm leading-snug break-words whitespace-pre-wrap">{item.message}</p>
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className="text-zinc-500 hover:text-white shrink-0 -mr-1 p-1 leading-none text-lg"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        );
      })}
      <style>{`@keyframes slideIn { from { transform: translateX(12px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </div>
  );
}
