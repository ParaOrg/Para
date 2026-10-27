import { fixRowSchema, recordingSchema, type FixRow, type Recording } from './recording-schema';

const DB_NAME = 'parapo-contribute';
const RECORDINGS = 'recordings';
const FIXES = 'fixes';

let opened: Promise<IDBDatabase> | null = null;

/** The one connection to the phone's database, opened on first use. */
function openDatabase(): Promise<IDBDatabase> {
  opened ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(RECORDINGS, { keyPath: 'id' });
      db.createObjectStore(FIXES, { keyPath: ['recordingId', 'seq'] });
    };
    request.onsuccess = () => {
      const db = request.result;
      // A browser may close the connection under a running page (low storage, a
      // cleared site); the next write then opens a fresh one.
      db.onclose = () => {
        opened = null;
      };
      db.onversionchange = () => {
        db.close();
        opened = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      opened = null;
      reject(request.error);
    };
  });
  return opened;
}

/** Runs `work` in one transaction and settles when the transaction has committed. */
async function inTransaction(
  stores: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => void,
): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    work(tx);
  });
}

function rowsOf(request: IDBRequest<unknown[]>): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Every recording on this phone, newest first. A row that no longer reads is left out and said. */
export async function loadRecordings(): Promise<Recording[]> {
  const db = await openDatabase();
  const rows = await rowsOf(db.transaction(RECORDINGS).objectStore(RECORDINGS).getAll());
  const recordings: Recording[] = [];
  for (const row of rows) {
    const read = recordingSchema.safeParse(row);
    if (read.success) recordings.push(read.data);
    else console.warn('A stored recording could not be read and was left out.', read.error);
  }
  return recordings.sort((a, b) => b.startedAt - a.startedAt);
}

/** Writes a recording, whole. */
export function putRecording(recording: Recording): Promise<void> {
  return inTransaction([RECORDINGS], 'readwrite', (tx) => {
    tx.objectStore(RECORDINGS).put(recording);
  });
}

/**
 * Changes a stored recording in one transaction, read and write together, so a
 * save in another tab is never overwritten with an older copy. A recording no
 * longer stored is left alone.
 */
export function updateRecording(
  recordingId: string,
  change: (recording: Recording) => Recording,
): Promise<void> {
  return inTransaction([RECORDINGS], 'readwrite', (tx) => {
    const store = tx.objectStore(RECORDINGS);
    const request = store.get(recordingId);
    request.onsuccess = () => {
      const read = recordingSchema.safeParse(request.result);
      if (read.success) store.put(change(read.data));
    };
  });
}

/** Writes one fix at once, so closing the tab loses nothing already received. */
export function putFix(row: FixRow): Promise<void> {
  return inTransaction([FIXES], 'readwrite', (tx) => {
    tx.objectStore(FIXES).put(row);
  });
}

/** The fixes of a recording, in the order they came. */
/** Writes fixes whose own writes failed, all in one transaction. */
export function putFixes(rows: readonly FixRow[]): Promise<void> {
  return inTransaction([FIXES], 'readwrite', (tx) => {
    const store = tx.objectStore(FIXES);
    for (const row of rows) store.put(row);
  });
}

export async function loadFixes(recordingId: string): Promise<FixRow[]> {
  const db = await openDatabase();
  const range = IDBKeyRange.bound([recordingId, 0], [recordingId, Number.MAX_SAFE_INTEGER]);
  const rows = await rowsOf(db.transaction(FIXES).objectStore(FIXES).getAll(range));
  const fixes: FixRow[] = [];
  for (const row of rows) {
    const read = fixRowSchema.safeParse(row);
    if (read.success) fixes.push(read.data);
    else console.warn('A stored fix could not be read and was left out.', read.error);
  }
  return fixes;
}

/** Deletes a recording and all its fixes together. */
export function deleteRecording(recordingId: string): Promise<void> {
  return inTransaction([RECORDINGS, FIXES], 'readwrite', (tx) => {
    tx.objectStore(RECORDINGS).delete(recordingId);
    tx.objectStore(FIXES).delete(
      IDBKeyRange.bound([recordingId, 0], [recordingId, Number.MAX_SAFE_INTEGER]),
    );
  });
}
