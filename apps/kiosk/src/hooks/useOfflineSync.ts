import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { drain, count } from '@/lib/offline-queue';
import { refreshCache } from '@/lib/cached-volunteers';

const SYNC_INTERVAL_MS = 30_000; // 30 seconds
const CACHE_REFRESH_MS = 5 * 60_000; // 5 minutes

export function useOfflineSync() {
  const syncRef = useRef(false);

  useEffect(() => {
    // Initial cache refresh
    refreshCache(supabase);

    // Periodic sync of queued mutations
    const syncInterval = setInterval(async () => {
      if (syncRef.current || !navigator.onLine) return;
      syncRef.current = true;

      try {
        const pending = await count();
        if (pending > 0) {
          const result = await drain(supabase);
          if (result.synced > 0) {
            console.log(`Synced ${result.synced} offline mutations`);
          }
        }
      } catch (err) {
        console.error('Sync failed:', err);
      } finally {
        syncRef.current = false;
      }
    }, SYNC_INTERVAL_MS);

    // Periodic volunteer cache refresh
    const cacheInterval = setInterval(() => {
      if (navigator.onLine) refreshCache(supabase);
    }, CACHE_REFRESH_MS);

    // Sync immediately when coming back online
    const handleOnline = async () => {
      await drain(supabase);
      await refreshCache(supabase);
    };
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(syncInterval);
      clearInterval(cacheInterval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);
}
