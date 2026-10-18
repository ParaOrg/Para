import { useEffect, useState } from 'react';

/**
 * Keeps the screen awake while `active`, so the phone does not stop locating
 * on its own. The browser drops the lock whenever the page is hidden, so it is
 * asked for again when the page comes back. Returns whether the lock is held:
 * a browser may refuse (no support, low battery), and the page says so.
 */
export function useWakeLock(active: boolean): boolean {
  const [isHeld, setIsHeld] = useState(false);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let isPending = false;
    let isStopped = false;
    const handleRelease = () => setIsHeld(false);

    // One request at a time: a page shown again while the first is pending must not
    // win a second lock that the cleanup would never release.
    const request = async () => {
      if (isPending || (sentinel && !sentinel.released)) return;
      isPending = true;
      try {
        const granted = await navigator.wakeLock.request('screen');
        if (isStopped) {
          await granted.release();
          return;
        }
        sentinel = granted;
        setIsHeld(true);
        granted.addEventListener('release', handleRelease);
      } catch (error) {
        // Refused: the recording goes on, and the page tells the contributor the screen may sleep.
        console.warn('The screen could not be kept awake.', error);
        setIsHeld(false);
      } finally {
        isPending = false;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      isStopped = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      sentinel?.removeEventListener('release', handleRelease);
      void sentinel?.release();
      setIsHeld(false);
    };
  }, [active]);

  return isHeld;
}
