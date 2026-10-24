import { readNativeWatchStats, startNativeWatch } from './native-location';
import type { WatchedFix } from './use-geolocation-watch';

const DB_NAME = 'parapo-spike';
const STORE = 'fixes';
const REPORT_EVERY_MS = 30_000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB would not open'));
  });
}

function putFix(db: IDBDatabase, fix: WatchedFix): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).add({ time: fix.timestamp, ...fix.coords });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'));
  });
}

/**
 * The emulator test's hook (.github/workflows/apk-spike.yml, scripts/apk/emulator-test.sh), in a
 * build made with VITE_SPIKE_AUTOSTART=1: starts the native watch with no taps, writes every fix
 * to IndexedDB as the recorder does, and prints a count every 30 s for the test to read from
 * logcat. The lines are `warn` because the lint rule allows no other level.
 */
export async function runSpikeAutostart(): Promise<void> {
  const db = await openDb();
  let written = 0;
  let failed = 0;
  await startNativeWatch({
    onFix: (fix) => {
      putFix(db, fix)
        .then(() => {
          written += 1;
        })
        .catch(() => {
          failed += 1;
        });
    },
    onError: (error) => console.warn(`PARAPO_ERROR ${error.message}`),
  });
  console.warn('PARAPO_STARTED');
  window.setInterval(() => {
    const { fixCount } = readNativeWatchStats();
    console.warn(`PARAPO_FIXES ${fixCount} IDB ${written} IDBFAIL ${failed}`);
  }, REPORT_EVERY_MS);
}
