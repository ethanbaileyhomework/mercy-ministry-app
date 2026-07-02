import { useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

interface UseRealtimeTableOptions {
  supabase: SupabaseClient;
  table: string;
  filter?: string;
  events?: RealtimeEvent[];
  onInsert?: (payload: Record<string, unknown>) => void;
  onUpdate?: (payload: Record<string, unknown>) => void;
  onDelete?: (payload: Record<string, unknown>) => void;
  onChange?: () => void;
  enabled?: boolean;
}

export function useRealtimeTable({
  supabase,
  table,
  filter,
  events = ['INSERT', 'UPDATE', 'DELETE'],
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeTableOptions) {
  const handleChange = useCallback(
    (eventType: RealtimeEvent, payload: Record<string, unknown>) => {
      if (eventType === 'INSERT') onInsert?.(payload);
      if (eventType === 'UPDATE') onUpdate?.(payload);
      if (eventType === 'DELETE') onDelete?.(payload);
      onChange?.();
    },
    [onInsert, onUpdate, onDelete, onChange]
  );

  useEffect(() => {
    if (!enabled) return;

    const channelName = filter ? `${table}:${filter}` : table;
    const subscriptionConfig: Record<string, unknown> = {
      event: events.length === 3 ? '*' : events[0],
      schema: 'public',
      table,
    };
    if (filter) {
      subscriptionConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as never,
        subscriptionConfig as never,
        (payload: { eventType: RealtimeEvent; new: Record<string, unknown> }) => {
          handleChange(payload.eventType, payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, table, filter, enabled, events, handleChange]);
}
