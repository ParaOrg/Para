import type { LngLat } from '@/shared/utils/geo';

/**
 * Where the rider's dot is, as the locator draws it: its fix and its accuracy ring's radius in
 * metres. The page's own shape: features/contribute may not import the locator, so the shell
 * hands it on, and the compiler checks there that the locator's fits it.
 */
export interface MapWhere {
  at: LngLat;
  ringM: number;
}
