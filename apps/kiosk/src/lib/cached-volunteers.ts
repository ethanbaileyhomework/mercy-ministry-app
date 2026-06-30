import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'mercy-kiosk-offline';
const DB_VERSION = 2;
const STORE_NAME = 'volunteer-cache';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('mutation-queue')) {
          db.createObjectStore('mutation-queue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function refreshCache(supabase: import('@supabase/supabase-js').SupabaseClient): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('volunteers')
      .select('*')
      .eq('is_active', true)
      .order('first_name');

    if (error) throw error;
    if (!data) return;

    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
    for (const vol of data) {
      await tx.store.put(vol);
    }
    await tx.done;
  } catch (err) {
    console.error('Failed to refresh volunteer cache:', err);
  }
}
