import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

export type { SupabaseClient };

export function createClient(supabaseUrl: string, supabaseKey: string): SupabaseClient {
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}
