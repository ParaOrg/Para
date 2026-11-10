import { currentMode } from './recording-rules';
import type { NativeRide, RideTaps } from '../native-bridge/native-contract';
import type { Recording } from '../storage/recording-schema';

/**
 * What the phone's ride (RidePlugin.now) holds for `recordingId`: its switches, its closed gaps,
 * and where it stands stopped. Null for another ride, or none.
 */
export function tapsOfNativeRide(ride: NativeRide, recordingId: string): RideTaps | null {
  if (ride.recordingId !== recordingId || ride.phase === 'none') return null;
  const open = ride.gaps.find((gap) => gap.to === 0) ?? null;
  const isStopped = ride.phase === 'paused' || ride.phase === 'finished';
  return {
    switches: ride.modes.map(({ time, to }) => ({ time, to })),
    gaps: ride.gaps
      .filter((gap) => gap.to !== 0)
      .map(({ from, to, reason }) => ({ from, to, reason })),
    openPause: isStopped && open ? open.from : null,
    finishedAt: ride.phase === 'finished' ? ride.finishedAt : null,
  };
}

/** A ride with the phone's taps applied, and where it now stands stopped, if anywhere. */
export interface TappedRide {
  recording: Recording;
  /** Stopped here by a pause or a Finish on the notification; null while it records on. */
  stopAt: number | null;
  /** Finish was tapped: the ride goes to its Save form. */
  isFinished: boolean;
}

/**
 * The ride with the phone's switches and closed gaps put in. Applied again, it adds nothing: a
 * switch already there (by its time) or a gap already there (by its start and reason) is not added
 * twice, so the phone's ride can be read and applied as often as the page likes. The Stop itself
 * (`stopAt`) is the caller's to make, as the recorder makes every Stop.
 */
export function withRideTaps(recording: Recording, taps: RideTaps): TappedRide {
  let modes = recording.modes;
  const ordered = [...taps.switches].sort((a, b) => a.time - b.time);
  for (const switched of ordered) {
    const isThere = modes.some((mode) => mode.time === switched.time);
    if (isThere || currentMode(modes) === switched.to) continue;
    modes = [...modes, switched].sort((a, b) => a.time - b.time);
  }
  const gaps = [...recording.gaps];
  for (const gap of taps.gaps) {
    if (gaps.some((there) => there.from === gap.from && there.reasons.includes(gap.reason)))
      continue;
    gaps.push({ from: gap.from, to: gap.to, reasons: [gap.reason] });
  }
  const isRunning = recording.status === 'recording';
  const stopAt = isRunning ? (taps.openPause ?? taps.finishedAt) : null;
  return {
    recording: { ...recording, modes, gaps },
    stopAt,
    isFinished: taps.finishedAt !== null,
  };
}
