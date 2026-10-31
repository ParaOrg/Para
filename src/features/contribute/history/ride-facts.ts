import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import { keptFixes, summarize, type Fix } from '@/features/routes/model/ride-recording';

import type { AccountUpload } from '../api/account-uploads';
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

/** A recording kept on this phone, from its fixes. With no mode kept it is all ride. */
export function rideFactsOf(recording: Recording, fixes: readonly Fix[]): RideFacts {
  const end = recording.stoppedAt ?? recording.savedAt ?? recording.startedAt;
  const summary = summarize(fixes, recording.gaps, recording.startedAt, end, recording.modes);
  return {
    distanceM: summary.distanceM,
    isWalkOnly: recording.modes.length > 0 && recording.modes.every((mode) => mode.to === 'walk'),
    trail: trailOf(keptFixes(fixes), recording.modes, recording.marks),
  };
}

/** An upload from another phone, from what the database keeps of it: no trail. */
export const uploadFactsOf = (upload: AccountUpload): RideFacts => ({
  distanceM: upload.distanceM,
  isWalkOnly: upload.walkM !== null && upload.walkM > 0 && upload.rideM === 0,
  trail: null,
});
