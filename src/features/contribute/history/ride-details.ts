import { isWalkOnlyOf, type RideFacts } from './ride-facts';
import { totalFareFigure } from '../account/commute-figures';
import { dayText, distanceFigure, tripTimeText } from '../common/format';
import { RIDE_LABEL } from '../screens/ride-choices';
import type { Recording } from '../storage/recording-schema';

/** One row of the ride's Commute Information (Figma 4560:12422). */
export interface RideDetailRow {
  label: string;
  value: string;
  /** What a screen reader says in the value's place, where the shown text reads badly. */
  spoken?: string;
}

/**
 * The ride's Commute Information, in the frame's order: transport mode, fare, distance, time,
 * date. A row with nothing known is left out (no vehicle picked, no fare typed, the distance
 * still being read), never shown empty. Time is the whole trip, Start to Stop.
 */
export function rideDetailsOf(recording: Recording, facts: RideFacts | null): RideDetailRow[] {
  const rows: RideDetailRow[] = [];
  const isWalkOnly = facts?.isWalkOnly ?? isWalkOnlyOf(recording);
  if (isWalkOnly) rows.push({ label: 'Transport mode', value: 'Lakad (walking)' });
  else if (recording.rideKind) {
    rows.push({ label: 'Transport mode', value: RIDE_LABEL[recording.rideKind] });
  }
  if (recording.farePhp !== undefined) {
    const fare = totalFareFigure(recording.farePhp, 1);
    rows.push({ label: 'Fare', value: fare.shown, spoken: fare.spoken });
  }
  const distanceM = facts?.distanceM ?? recording.distanceM;
  if (distanceM !== undefined) {
    const distance = distanceFigure(distanceM);
    rows.push({ label: 'Distance', value: `${distance.value} ${distance.unit}` });
  }
  const stoppedAt = recording.stoppedAt ?? recording.startedAt;
  rows.push({ label: 'Time', value: tripTimeText((stoppedAt - recording.startedAt) / 1000) });
  rows.push({ label: 'Date', value: dayText(recording.startedAt) });
  return rows;
}
