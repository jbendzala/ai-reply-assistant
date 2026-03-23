import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

const FREE_TIER_LIMIT = 30;

export function useUsageCount() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const session = useAuthStore((s) => s.session);

  const email = session?.user.email ?? null;

  const refresh = useCallback(async () => {
    if (!email) return;
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const { data } = await supabase
      .from('usage_by_email')
      .select('count')
      .eq('email', email)
      .eq('month', month)
      .maybeSingle();
    setCount((data as { count: number } | null)?.count ?? 0);
    setLoading(false);
  }, [email]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription — updates instantly when the Edge Function writes
  useEffect(() => {
    if (!email) return;
    const channel = supabase
      .channel(`usage-email-${email}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usage_by_email',
          filter: `email=eq.${email}`,
        },
        (payload) => {
          const newCount = (payload.new as { count?: number } | null)?.count;
          if (typeof newCount === 'number') {
            setCount(newCount);
            setLoading(false);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [email]);

  // Next reset = 1st of next month
  const resetDate = (() => {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  })();

  return { count, loading, limit: FREE_TIER_LIMIT, resetDate, refresh };
}
