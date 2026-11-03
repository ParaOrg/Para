import { useEffect, useState } from 'react';

/** How long a load may take before its skeleton shows: a quicker one shows nothing, no flash. */
export const SKELETON_DELAY_MS = 300;

/** Whether `isLoading` has lasted past SKELETON_DELAY_MS: the moment a skeleton shows. */
export function useIsSlowLoad(isLoading: boolean): boolean {
  const [isLate, setIsLate] = useState(false);
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setIsLate(true), SKELETON_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setIsLate(false);
    };
  }, [isLoading]);
  return isLoading && isLate;
}
