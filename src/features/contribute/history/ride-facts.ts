import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import { keptFixes, type Fix } from '@/features/routes/model/ride-recording';

import type { AccountUpload } from '../api/account-uploads';
import { distanceOf } from '../recorder/recording-figures';
import { trailOf } from '../recorder/recording-rules';
import type { Recording } from '../storage/recording-schema';

/** What a card shows of a recording beyond its names and times. */
export interface RideFacts {
  distanceM: number;
  /** Walked the whole way: the card shows the Lakad foot in place of a vehicle. */
  isWalkOnly: boolean;
  /** The whole trail, for the card's drawing when there is no picture; null when not on this phone. */
  trail: RecordingTrail | null;
}

/** Whether it was walked the whole way: known from its modes alone. */
export const isWalkOnlyOf = (recording: Recording): boolean =>
  recording.modes.length > 0 && recording.modes.every((mode) => mode.to === 'walk');

/** A recording kept on this phone, from its fixes. */
export function rideFactsOf(recording: Recording, fixes: readonly Fix[]): RideFacts {
  return {
    distanceM: recording.distanceM ?? distanceOf(recording, fixes),
    isWalkOnly: isWalkOnlyOf(recording),
    trail: trailOf(keptFixes(fixes), recording.modes, recording.marks),
  };
}

/** A recording kept on this phone with its distance stored: all but its trail, without its fixes. */
export function storedFactsOf(recording: Recording): RideFacts | null {
  if (recording.distanceM === undefined) return null;
  return { distanceM: recording.distanceM, isWalkOnly: isWalkOnlyOf(recording), trail: null };
}

/** An upload from another phone, from what the database keeps of it: no trail. */
export const uploadFactsOf = (upload: AccountUpload): RideFacts => ({
  distanceM: upload.distanceM,
  isWalkOnly: upload.walkM !== null && upload.walkM > 0 && upload.rideM === 0,
  trail: null,
});
