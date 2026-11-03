import { currentMode } from './recording-rules';
import type { RideEvent, RideTaps } from '../native-bridge/native-contract';
import type { Recording } from '../storage/recording-schema';

/** The taps made on `recordingId`, folded in time order. Taps on another recording are not its. */
export function foldRideEvents(events: readonly RideEvent[], recordingId: string): RideTaps {
  const taps: RideTaps = {
    switches: [],
    pauses: [],
    openPause: null,
    finishedAt: null,
    lastTime: 0,
  };
  const ordered = [...events].sort((a, b) => a.time - b.time);
  for (const event of ordered) {
    taps.lastTime = Math.max(taps.lastTime, event.time);
    if (event.recordingId !== recordingId) continue;
    if (event.kind === 'mode' && event.to) taps.switches.push({ time: event.time, to: event.to });
    if (event.kind === 'pause') taps.openPause = event.time;
    if (event.kind === 'resume' && taps.openPause !== null) {
      taps.pauses.push({ from: taps.openPause, to: event.time });
      taps.openPause = null;
    }
    if (event.kind === 'finish') taps.finishedAt = event.time;
  }
  return taps;
}

/** A ride with the taps applied, and where it now stands stopped, if anywhere. */
export interface TappedRide {
  recording: Recording;
  /** Stopped here by a pause or a Finish on the notification; null while it records on. */
  stopAt: number | null;
  /** Finish was tapped: the ride goes to its Save form. */
  isFinished: boolean;
}

/**
 * The ride's mode switches and finished pauses, as the notification's taps made them. Applied
 * again, it adds nothing: a switch or a pause already there (by its time) is not added twice. The
 * Stop itself (`stopAt`) is the caller's to make, as the recorder makes every Stop.
 */
export function withRideTaps(recording: Recording, taps: RideTaps): TappedRide {
  let modes = recording.modes;
  for (const switched of taps.switches) {
    const isThere = modes.some((mode) => mode.time === switched.time);
    if (isThere || currentMode(modes) === switched.to) continue;
    modes = [...modes, switched];
  }
  const gaps = [...recording.gaps];
  for (const pause of taps.pauses) {
    if (gaps.some((gap) => gap.from === pause.from && gap.reasons.includes('paused'))) continue;
    gaps.push({ from: pause.from, to: pause.to, reasons: ['paused'] });
  }
  const isRunning = recording.status === 'recording';
  const stopAt = isRunning ? (taps.openPause ?? taps.finishedAt) : null;
  return {
    recording: { ...recording, modes, gaps },
    stopAt,
    isFinished: taps.finishedAt !== null,
  };
}
