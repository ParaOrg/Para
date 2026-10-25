import { useEffect, useRef } from 'react';

import { isNativeApp } from './native-app';

/** The part of a position the recorder uses; the browser's and the app's both fit it. */
export interface WatchedFix {
  timestamp: number;
  coords: { longitude: number; latitude: number; accuracy: number };
}

/** A failed location request: 1 denied, 2 unavailable, 3 timed out, as the browser numbers them. */
export interface WatchError {
  code: number;
  message: string;
}

interface GeolocationWatchHandlers {
  /** Fixes in time order; the app may hand over fixes already given, which the recorder skips. */
  onFixes: (fixes: WatchedFix[]) => void;
  onError: (error: WatchError) => void;
}

/**
 * Watches the phone's position at high accuracy while `active`, and lets the watch go when it is
 * not. The handlers are read from a ref, so a new function on every render does not restart the
 * watch. In the Android app the fixes come from a foreground service that goes on with the screen
 * off (native/native-location.ts) and are kept natively for `recordingId`; on the web they come
 * from the browser.
 */
export function useGeolocationWatch(
  active: boolean,
  recordingId: string | null,
  handlers: GeolocationWatchHandlers,
): void {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!active) return;
    const onError = (error: WatchError) => latest.current.onError(error);

    if (import.meta.env.MODE === 'apk' && isNativeApp() && recordingId) {
      return watchInApp(recordingId, (fixes) => latest.current.onFixes(fixes), onError);
    }

    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => latest.current.onFixes([position]),
      onError,
      { enableHighAccuracy: true, maximumAge: 0 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [active, recordingId]);
}

/** Starts the app's watch; returns what stops it, whether or not it has started yet. */
function watchInApp(
  recordingId: string,
  onFixes: (fixes: WatchedFix[]) => void,
  onError: (error: WatchError) => void,
): () => void {
  let isStopped = false;
  let stop: (() => void) | null = null;
  import('./native/native-location')
    .then(({ startNativeWatch }) => startNativeWatch({ recordingId, onFixes, onError }))
    .then((stopWatch) => {
      if (isStopped) stopWatch();
      else stop = stopWatch;
    })
    .catch((error: unknown) => {
      onError({ code: 2, message: error instanceof Error ? error.message : 'native watch failed' });
    });
  return () => {
    isStopped = true;
    stop?.();
  };
}
