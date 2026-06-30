import { openDB, type IDBPDatabase } from 'idb';

interface QueuedMutation {
  id: string;
  type: 'sign-in' | 'sign-out' | 'register';
  table: string;
  operation: 'insert' | 'update';
  payload: Record<string, unknown>;
  filter?: Record<string, unknown>;
  timestamp: number;
}

const DB_NAME = 'mercy-kiosk-offline';
const DB_VERSION = 1;
const STORE_NAME = 'mutation-queue';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAll(): Promise<QueuedMutation[]> {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME);
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

export async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function drain(supabase: import('@supabase/supabase-js').SupabaseClient): Promise<{ synced: number; failed: number }> {
  const mutations = await getAll();
  let synced = 0;
  let failed = 0;

  for (const mutation of mutations) {
    try {
      if (mutation.operation === 'insert') {
        const { error } = await supabase.from(mutation.table).insert(mutation.payload);
        if (error) {
          // If duplicate (conflict on unique constraint), treat as already synced
          if (error.code === '23505') {
            await remove(mutation.id);
            synced++;
            continue;
          }
          throw error;
        }
      } else if (mutation.operation === 'update' && mutation.filter) {
        let query = supabase.from(mutation.table).update(mutation.payload);
        for (const [key, value] of Object.entries(mutation.filter)) {
          query = query.eq(key, value as string);
        }
        const { error } = await query;
        if (error) throw error;
      }

      await remove(mutation.id);
      synced++;
    } catch (err) {
      console.error(`Failed to sync mutation ${mutation.id}:`, err);
      failed++;
    }
  }

  return { synced, failed };
}

export async function count(): Promise<number> {
  const db = await getDb();
  return db.count(STORE_NAME);
}
