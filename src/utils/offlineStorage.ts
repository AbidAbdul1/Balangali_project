/**
 * IndexedDB Offline Travel Assistant Storage
 *
 * Stores downloaded trips, itineraries, selected places, booking references,
 * emergency contacts, and an offline sync queue for when connectivity returns.
 */
import { ItineraryPlan } from '../types/travel';

const DB_NAME = 'ai_travelmate_offline';
const DB_VERSION = 1;
const STORE_TRIPS = 'offline_trips';
const STORE_SYNC = 'sync_queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TRIPS)) {
        db.createObjectStore(STORE_TRIPS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC)) {
        db.createObjectStore(STORE_SYNC, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface OfflineTripRecord extends ItineraryPlan {
  downloadedAt: string;
  emergencyContacts?: string;
  accommodationNotes?: string;
}

export async function saveTripOffline(
  trip: ItineraryPlan,
  extras?: { emergencyContacts?: string; accommodationNotes?: string }
): Promise<void> {
  const db = await openDB();
  const record: OfflineTripRecord = {
    ...trip,
    downloadedAt: new Date().toISOString(),
    emergencyContacts: extras?.emergencyContacts,
    accommodationNotes: extras?.accommodationNotes,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_TRIPS, 'readwrite');
    tx.objectStore(STORE_TRIPS).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineTrips(): Promise<OfflineTripRecord[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TRIPS, 'readonly');
      const req = tx.objectStore(STORE_TRIPS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeOfflineTrip(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_TRIPS, 'readwrite');
    tx.objectStore(STORE_TRIPS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueOfflineSync(action: { type: 'save_trip'; payload: any }): Promise<void> {
  const db = await openDB();
  const item = { id: `sync_${Date.now()}`, ...action, queuedAt: new Date().toISOString() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC, 'readwrite');
    tx.objectStore(STORE_SYNC).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushOfflineSyncQueue(): Promise<number> {
  if (!navigator.onLine) return 0;
  try {
    const db = await openDB();
    const items: any[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC, 'readonly');
      const req = tx.objectStore(STORE_SYNC).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    let synced = 0;
    for (const item of items) {
      if (item.type === 'save_trip') {
        const res = await fetch('/api/saved-trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });
        if (res.ok) {
          await new Promise<void>((resolve) => {
            const tx = db.transaction(STORE_SYNC, 'readwrite');
            tx.objectStore(STORE_SYNC).delete(item.id);
            tx.oncomplete = () => resolve();
          });
          synced++;
        }
      }
    }
    return synced;
  } catch {
    return 0;
  }
}

