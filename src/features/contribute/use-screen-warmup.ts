import { useEffect } from 'react';

import { canUpload } from './api/contribute-client';
import {
  loadFlagStopButton,
  loadRecordingScreen,
  loadSaveForm,
  loadStopRecordingScreen,
  loadUnfinishedScreen,
} from './lazy-screens';
import type { Phase } from './recorder/recording-state';
import { warmScreen } from './screen-loaders';
import { warmToolbarSlide } from './toolbar/use-toolbar-slide';

/** How long Start waits for the browser's idle time before fetching History and Account anyway. */
const WARM_SCREENS_WITHIN_MS = 2000;

/**
 * Fetches the page's screens ahead of their need, so a tap never waits on the network.
 *
 * @param fetchStartMorph - Start's morph into the recording screen (useStartMorph's fetchAhead):
 *   fetched with the recording screens. A stable reference.
 */
export function useScreenWarmup(phase: Phase, fetchStartMorph: () => Promise<void>): void {
  // On Ready the recording screens are fetched ahead of Start, and the save screens too, also when
  // the page opens on a ride already under way, so stopping one never waits on the network. A
  // failure here is only a missed head start: the lazy screen asks again when it is shown.
  useEffect(() => {
    if (phase !== 'ready' && phase !== 'recording' && phase !== 'paused') return;
    Promise.all([
      loadRecordingScreen(),
      loadUnfinishedScreen(),
      loadStopRecordingScreen(),
      loadFlagStopButton(),
      loadSaveForm(),
      fetchStartMorph(),
    ]).catch((error: unknown) => {
      console.warn('The recording screens could not be fetched ahead of Start.', error);
    });
  }, [phase, fetchStartMorph]);

  // History and Account fetched ahead once Start has settled, in the browser's idle time, so the
  // first tap on their tab finds them here: its move starts at once, on the real screen. The
  // toolbar's slide comes with them.
  useEffect(() => {
    if (phase !== 'ready') return;
    const warm = () => {
      warmScreen('history');
      if (canUpload()) warmScreen('account');
      warmToolbarSlide();
    };
    if ('requestIdleCallback' in window) {
      const idle = window.requestIdleCallback(warm, { timeout: WARM_SCREENS_WITHIN_MS });
      return () => window.cancelIdleCallback(idle);
    }
    // Safari has no idle callback: a plain wait stands in for it.
    const later = setTimeout(warm, WARM_SCREENS_WITHIN_MS);
    return () => clearTimeout(later);
  }, [phase]);
}
