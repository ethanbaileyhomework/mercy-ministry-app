import { useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Session } from '../types';

export function useSessionUpdates(
  session: Session | null,
  setSession: (s: Session) => void,
  supabaseClient?: SupabaseClient
) {
  const updateCounter = useCallback(
    async (field: 'people_served' | 'meals_served' | 'grocery_packs_given', delta: number) => {
      if (!session || !supabaseClient) return;
      const current = session[field] || 0;
      const newVal = Math.max(0, Math.min(9999, current + delta));
      const { error } = await supabaseClient
        .from('sessions')
        .update({ [field]: newVal })
        .eq('id', session.id);
      if (error) {
        console.error(`Failed to update ${field}:`, error.message);
        return;
      }
      setSession({ ...session, [field]: newVal });
    },
    [session, setSession, supabaseClient]
  );

  const saveTextField = useCallback(
    async (field: 'what_was_served' | 'coordinator_notes', value: string) => {
      if (!session || !supabaseClient) return;
      const { error } = await supabaseClient
        .from('sessions')
        .update({ [field]: value || null })
        .eq('id', session.id);
      if (error) {
        console.error(`Failed to save ${field}:`, error.message);
        return;
      }
      setSession({ ...session, [field]: value || null });
    },
    [session, setSession, supabaseClient]
  );

  return { updateCounter, saveTextField };
}
