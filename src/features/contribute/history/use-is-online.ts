import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** Whether the phone says it has a connection, as it changes: History's "Waiting for signal". */
export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine);
}
