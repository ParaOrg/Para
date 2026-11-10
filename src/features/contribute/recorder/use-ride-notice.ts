import { useEffect, useRef, useState, type RefObject } from 'react';

import { noticePhaseOf } from './notice-phase';
import { pausedSecondsOf } from './recording-figures';
import { currentMode } from './recording-rules';
import type { Phase } from './recording-state';
import { withRideTaps } from './ride-events';
import {
  dropRideTaps,
  onRideTap,
  readRideTaps,
  tellRideNotice,
} from '../native-bridge/ride-notice-bridge';
import type { Recording } from '../storage/recording-schema';

interface RideNoticeOptions {
  phase: Phase;
  recording: Recording | null;
  currentRef: RefObject<Recording | null>;
  keep: (recording: Recording) => void;
  /** The recorder's own Stop, at a time, then the phase after it. */
  finish: (at: number, next: 'paused' | 'form') => void;
  setPhase: (phase: Phase) => void;
}

/**
 * The app's ride notification (Android): told where the ride is as it changes, and its taps,
 * Lakad or Sakay, Pause, Resume and Finish, applied to the ride where they were made. The taps
 * made while the page slept are applied as it wakes; one made while it is awake, at once. A pause
 * already resumed is the ride's paused gap; a pause or a Finish standing is the recorder's own
 * Stop at its time. The notification is told where a ride is only once its taps have been
 * applied. Nothing on the web.
 */
export function useRideNotice({
  phase,
  recording,
  currentRef,
  keep,
  finish,
  setPhase,
}: RideNoticeOptions): void {
  const recordingId = recording?.id ?? '';
  // Null while the page loads: it tells nothing until it knows the ride the phone holds.
  const told = noticePhaseOf(phase);
  const noticePhase = told ?? 'none';
  const mode = currentMode(recording?.modes ?? []);
  const startedAt = recording?.startedAt ?? 0;
  const stoppedAt = recording?.stoppedAt ?? null;
  const pausedSeconds = recording ? pausedSecondsOf(recording) : 0;

  // The ride whose notification taps have been applied once since the page opened. Until they
  // are, the ride the page holds may be older than the notification's: a Lakad or Sakay tapped
  // there and not yet applied would be undone (RidePlugin.setState writes the mode it is told),
  // and the next tap would switch from the wrong mode.
  const [caughtUpId, setCaughtUpId] = useState('');
  const isCaughtUp = noticePhase === 'none' || caughtUpId === recordingId;

  // The notification follows the ride: outside React, so it is told, not rendered.
  useEffect(() => {
    if (!isCaughtUp || told === null) return;
    tellRideNotice({
      recordingId,
      phase: noticePhase,
      mode,
      startedAt,
      pausedSeconds,
      stoppedAt,
    }).catch((error: unknown) => {
      console.warn('The ride notification could not be told where the ride is.', error);
    });
  }, [isCaughtUp, told, recordingId, noticePhase, mode, startedAt, pausedSeconds, stoppedAt]);

  // The latest of each, for taps heard outside a render.
  const latest = useRef({ keep, finish, setPhase });
  useEffect(() => {
    latest.current = { keep, finish, setPhase };
  });

  // Listens for taps while a ride is on: a native event, and the page shown again after sleeping.
  useEffect(() => {
    if (noticePhase === 'none' || recordingId === '') return;
    let isApplying = false;
    // A tap heard while the last ones are being applied is applied right after, not dropped.
    let isTappedMeanwhile = false;
    const apply = () => {
      if (isApplying) {
        isTappedMeanwhile = true;
        return;
      }
      isApplying = true;
      isTappedMeanwhile = false;
      applyTaps()
        .catch((error: unknown) => {
          console.error('The taps on the ride notification could not be applied.', error);
        })
        .finally(() => {
          isApplying = false;
          // Applied or not, the notification is told from now on: a failure is not left to hold
          // it back for the rest of the ride.
          setCaughtUpId(recordingId);
          if (isTappedMeanwhile) apply();
        });
    };
    const applyTaps = async () => {
      const held = currentRef.current;
      if (!held) return;
      const taps = await readRideTaps(held.id);
      if (!taps) return;
      const ride = currentRef.current ?? held;
      const tapped = withRideTaps(ride, taps);
      const { keep: keepRide, finish: stop, setPhase: show } = latest.current;
      keepRide(tapped.recording);
      if (tapped.stopAt !== null) stop(tapped.stopAt, tapped.isFinished ? 'form' : 'paused');
      else if (tapped.isFinished) show('form');
      await dropRideTaps(taps.lastTime);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') apply();
    };
    const stopHearing = onRideTap(apply);
    document.addEventListener('visibilitychange', handleVisibility);
    apply();
    return () => {
      stopHearing();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [noticePhase, recordingId, currentRef]);
}
