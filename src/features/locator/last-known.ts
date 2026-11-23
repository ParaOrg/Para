import * as z from 'zod/mini';

import type { LngLat } from '@/shared/utils/geo';

/**
 * Where the contributor app last had the phone, kept on the phone only (never sent, never ride
 * data), so the map can show it greyed out when location is off or no fix comes, as Life360's
 * "1 minute ago".
 */
export interface LastKnown {
  at: LngLat;
  /** When the phone took that fix, in milliseconds since the epoch. */
  time: number;
}

const STORAGE_KEY = 'para.contributor.last-location.v1';

const lastKnownSchema = z.object({
  at: z.tuple([z.number(), z.number()]),
  time: z.number(),
});

/** The place kept from an earlier fix, this run or one before; null with none, or none readable. */
export function readLastKnown(): LastKnown | null {
  try {
    const kept = localStorage.getItem(STORAGE_KEY);
    if (kept === null) return null;
    const read = lastKnownSchema.safeParse(JSON.parse(kept));
    return read.success ? read.data : null;
  } catch {
    // Blocked storage, or a copy that is not JSON: no last place to show.
    return null;
  }
}

/** Keeps a fix as the last known place. */
export function keepLastKnown(place: LastKnown): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
  } catch (error) {
    console.warn('The last known place could not be kept on the phone.', error);
  }
}

const MINUTE_MS = 60_000;

/** How long ago the place was, as its pill says it: "1 min ago", "5 min ago", "2 hr ago", "3 days ago". */
export function agoText(time: number, now: number): string {
  const minutes = Math.max(1, Math.floor((now - time) / MINUTE_MS));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}
