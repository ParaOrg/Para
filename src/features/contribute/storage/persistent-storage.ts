import { useSyncExternalStore } from 'react';

/**
 * What the browser said to keeping this page's data: 'unknown' until it answers, 'granted' when
 * a phone low on space will not wipe unsent recordings, 'denied' when it may, 'unsupported'
 * where there is no way to ask.
 */
export type PersistentStorage = 'unknown' | 'granted' | 'denied' | 'unsupported';

let answer: PersistentStorage = 'unknown';
const listeners = new Set<() => void>();

function keep(next: PersistentStorage): void {
  answer = next;
  for (const listener of listeners) listener();
}

/** Asks the browser to keep this page's data, once per page, and keeps the answer. */
export async function askForPersistentStorage(): Promise<void> {
  if (!('storage' in navigator) || !('persist' in navigator.storage)) {
    keep('unsupported');
    return;
  }
  try {
    const isKept = (await navigator.storage.persisted()) || (await navigator.storage.persist());
    keep(isKept ? 'granted' : 'denied');
  } catch (error) {
    console.warn('Persistent storage could not be asked for.', error);
    keep('denied');
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The browser's answer to keeping the data, for the Ready screen. */
export function usePersistentStorage(): PersistentStorage {
  return useSyncExternalStore(subscribe, () => answer);
}
