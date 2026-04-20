import { useEffect, useState, useCallback } from 'react';
import { inboxApi, type InboxCounts } from '../lib/inboxApi';

/**
 * Poll /api/admin/inbox/counts every 30s so sidebar badges update
 * without a full page reload. Returns null while the first fetch
 * is in-flight — callers should treat null as "no badge yet".
 *
 * Failures are swallowed silently: a hiccup in the admin API
 * shouldn't overlay an error UI on top of every page; the badges
 * simply stop updating until the next successful poll.
 */
export function useInboxCounts(pollMs = 30_000): { counts: InboxCounts | null; refresh: () => void } {
  const [counts, setCounts] = useState<InboxCounts | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await inboxApi.counts();
      setCounts(data);
    } catch {
      // Ignore — stale counts are fine until we next recover.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await inboxApi.counts();
        if (!cancelled) setCounts(data);
      } catch { /* noop */ }
    })();
    const id = window.setInterval(() => {
      if (cancelled) return;
      refresh();
    }, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs, refresh]);

  return { counts, refresh };
}
