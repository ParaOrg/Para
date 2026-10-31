import {
  fixRowSchema,
  storedRecordingSchema,
  thumbnailRowSchema,
  type FixRow,
  type Recording,
} from './recording-schema';

const DB_NAME = 'para-contribute';

const RECORDINGS = 'recordings';
const FIXES = 'fixes';
/** A small picture of each saved recording's route, for History's cards; apart from the recording. */
const THUMBNAILS = 'thumbnails';

/**
 * The database's version. Versions only ever go forward: a change undone in the code is undone by
 * a newer version (3), never by going back to 1, which every phone that opened 2 would refuse.
 */
const DB_VERSION = 2;

let opened: Promise<IDBDatabase> | null = null;

/**
 * Opens the database at `version`, or, with none, at the version the phone already has. Each
 * store is made if it is missing, whatever version the phone had: 2 added the thumbnails, and a
 * phone on 1 keeps its recordings and fixes as they are.
 */
function openRequest(version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request =
      version === undefined ? indexedDB.open(DB_NAME) : indexedDB.open(DB_NAME, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      const has = (store: string) => db.objectStoreNames.contains(store);
      if (!has(RECORDINGS)) db.createObjectStore(RECORDINGS, { keyPath: 'id' });
      if (!has(FIXES)) db.createObjectStore(FIXES, { keyPath: ['recordingId', 'seq'] });
      if (!has(THUMBNAILS)) db.createObjectStore(THUMBNAILS, { keyPath: 'recordingId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * The one connection to the phone's database, opened on first use. A page older than the phone's
 * database (a tab left open across an update, or an update rolled back) opens it at the phone's
 * own version rather than failing: it then reads and writes the stores it knows.
 */
function openDatabase(): Promise<IDBDatabase> {
  opened ??= openRequest(DB_VERSION)
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'VersionError') return openRequest();
      throw error;
    })
    .then((db) => {
      // A browser may close the connection under a running page (low storage, a cleared site);
      // the next write then opens a fresh one.
      db.onclose = () => {
        opened = null;
      };
      db.onversionchange = () => {
        db.close();
        opened = null;
      };
      return db;
    })
    .catch((error: unknown) => {
      opened = null;
      throw error;
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
    const read = storedRecordingSchema.safeParse(row);
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
      const read = storedRecordingSchema.safeParse(request.result);
      if (read.success) store.put(change(read.data));
    };
  });
}

/** Writes fixes whose own writes failed, all in one transaction. */
export function putFixes(rows: readonly FixRow[]): Promise<void> {
  return inTransaction([FIXES], 'readwrite', (tx) => {
    const store = tx.objectStore(FIXES);
    for (const row of rows) store.put(row);
  });
}

/** The fixes of a recording, in the order they came. */
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

/**
 * Keeps a recording's thumbnail, a data URL of a few kB, only while the recording itself is still
 * kept: a picture finished after the recording was thrown away (Stop without saving during the
 * capture) is dropped, in the same transaction, so nothing is left that no delete would reach.
 */
export function putThumbnail(recordingId: string, dataUrl: string): Promise<void> {
  return inTransaction([RECORDINGS, THUMBNAILS], 'readwrite', (tx) => {
    const kept = tx.objectStore(RECORDINGS).getKey(recordingId);
    kept.onsuccess = () => {
      if (kept.result === undefined) return;
      tx.objectStore(THUMBNAILS).put({ recordingId, dataUrl });
    };
  });
}

/** Every thumbnail kept, by recording. A row that does not read is left out. */
export async function loadThumbnails(): Promise<Map<string, string>> {
  const db = await openDatabase();
  const rows = await rowsOf(db.transaction(THUMBNAILS).objectStore(THUMBNAILS).getAll());
  const thumbnails = new Map<string, string>();
  for (const row of rows) {
    const read = thumbnailRowSchema.safeParse(row);
    if (read.success) thumbnails.set(read.data.recordingId, read.data.dataUrl);
  }
  return thumbnails;
}

/** Deletes a recording, all its fixes and its thumbnail together. */
export function deleteRecording(recordingId: string): Promise<void> {
  return inTransaction([RECORDINGS, FIXES, THUMBNAILS], 'readwrite', (tx) => {
    tx.objectStore(RECORDINGS).delete(recordingId);
    tx.objectStore(THUMBNAILS).delete(recordingId);
    tx.objectStore(FIXES).delete(
      IDBKeyRange.bound([recordingId, 0], [recordingId, Number.MAX_SAFE_INTEGER]),
    );
  });
}
