import { isWalkOnlyOf, type RideFacts } from './ride-facts';
import { rideTitleOf } from './ride-title';
import { dayText, distanceFigure, hoursMinutesText, type Figure } from '../common/format';
import { RIDE_LABEL } from '../screens/ride-choices';
import type { Recording } from '../storage/recording-schema';

/** What the ride's summary card says, in the order it says it. */
export interface RideSummary {
  /** Where it began, else its description: the card's headline. */
  title: string;
  /** Where it went; empty when none was written. */
  to: string;
  /** The vehicle, `Lakad` for a walk, or empty when none was picked. */
  mode: string;
  /** Distance; null while it is still being read. */
  distance: Figure | null;
  /** Start to Stop, as History's card says it: `0h 12m`. */
  time: string;
  /** The day, as History's card says it: `Jan 25, 2026`. */
  date: string;
}

/** The ride's summary card, from what its screen already knows of it. */
export function rideSummaryOf(recording: Recording, facts: RideFacts | null): RideSummary {
  const isWalkOnly = facts?.isWalkOnly ?? isWalkOnlyOf(recording);
  const distanceM = facts?.distanceM ?? recording.distanceM;
  const stoppedAt = recording.stoppedAt ?? recording.startedAt;
  return {
    title: rideTitleOf(recording),
    to: recording.endPointName,
    mode: isWalkOnly ? 'Lakad' : recording.rideKind ? RIDE_LABEL[recording.rideKind] : '',
    distance: distanceM === undefined ? null : distanceFigure(distanceM),
    time: hoursMinutesText((stoppedAt - recording.startedAt) / 1000),
    date: dayText(recording.startedAt),
  };
}
