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
  onFix: (fix: WatchedFix) => void;
  onError: (error: WatchError) => void;
}

/**
 * Watches the phone's position at high accuracy while `active`, and lets the
 * watch go when it is not. The handlers are read from a ref, so a new function
 * on every render does not restart the watch. In the Android app the fixes come
 * from a foreground service (native-location.ts), which goes on with the screen
 * off; on the web they come from the browser.
 */
export function useGeolocationWatch(active: boolean, handlers: GeolocationWatchHandlers): void {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!active) return;
    const onFix = (fix: WatchedFix) => latest.current.onFix(fix);
    const onError = (error: WatchError) => latest.current.onError(error);

    if (isNativeApp()) {
      let isStopped = false;
      let stop: (() => void) | null = null;
      import('./native-location')
        .then(({ startNativeWatch }) => startNativeWatch({ onFix, onError }))
        .then((stopWatch) => {
          if (isStopped) stopWatch();
          else stop = stopWatch;
        })
        .catch((error: unknown) => {
          onError({
            code: 2,
            message: error instanceof Error ? error.message : 'native watch failed',
          });
        });
      return () => {
        isStopped = true;
        stop?.();
      };
    }

    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(onFix, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
    });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [active]);
}
