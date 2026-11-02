import { useEffect, useRef, type RefObject } from 'react';

import { mergeGaps } from '@/features/routes/model/ride-recording';

import { currentMode } from './recording-rules';
import type { Phase } from './recording-state';
import { withRideTaps } from './ride-events';
import { dropRideTaps, onRideTap, readRideTaps, tellRideNotice } from './ride-notice-bridge';
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

/** The time a ride has stood paused, its pauses joined where they touch. */
function pausedSecondsOf(recording: Recording): number {
  const paused = mergeGaps(recording.gaps.filter((gap) => gap.reasons.includes('paused')));
  return paused.reduce((sum, gap) => sum + (gap.to - gap.from) / 1000, 0);
}

/**
 * The app's ride notification (Android): told where the ride is as it changes, and its taps,
 * Lakad or Sakay, Pause, Resume and Finish, applied to the ride where they were made. The taps
 * made while the page slept are applied as it wakes; one made while it is awake, at once. A pause
 * already resumed is the ride's paused gap; a pause or a Finish standing is the recorder's own
 * Stop at its time. Nothing on the web.
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
  const noticePhase = phase === 'recording' || phase === 'paused' ? phase : 'none';
  const mode = currentMode(recording?.modes ?? []);
  const startedAt = recording?.startedAt ?? 0;
  const stoppedAt = recording?.stoppedAt ?? null;
  const pausedSeconds = recording ? pausedSecondsOf(recording) : 0;

  // The notification follows the ride: outside React, so it is told, not rendered.
  useEffect(() => {
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
  }, [recordingId, noticePhase, mode, startedAt, pausedSeconds, stoppedAt]);

  // The latest of each, for taps heard outside a render.
  const latest = useRef({ keep, finish, setPhase });
  useEffect(() => {
    latest.current = { keep, finish, setPhase };
  });

  // Listens for taps while a ride is on: a native event, and the page shown again after sleeping.
  useEffect(() => {
    if (noticePhase === 'none' || recordingId === '') return;
    let isApplying = false;
    const apply = () => {
      if (isApplying) return;
      isApplying = true;
      applyTaps()
        .catch((error: unknown) => {
          console.error('The taps on the ride notification could not be applied.', error);
        })
        .finally(() => {
          isApplying = false;
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
