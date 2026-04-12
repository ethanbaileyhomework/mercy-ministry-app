import { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Session } from '../types/database';
import { getCurrentDateAEST } from '../utils/date';

export function useActiveSession(supabase: SupabaseClient) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActiveSession() {
      try {
        setLoading(true);
        const today = getCurrentDateAEST();

        // Look for an active session first, then a draft session for today
        const { data, error: fetchError } = await supabase
          .from('sessions')
          .select('*')
          .eq('session_date', today)
          .in('status', ['active', 'draft'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        setSession(data as Session | null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    }

    fetchActiveSession();
  }, [supabase]);

  return { session, loading, error, setSession };
}
