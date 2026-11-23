import { useId } from 'react';

import type { Timeline } from '@/features/routes/model/timeline';

import { RouteLine } from './route-line';

interface SaveTimelineProps {
  isLoop: boolean;
  /** The places a loop goes round. */
  loopPlacesCount: number;
  /** What the line passes, by the rule the save will apply. */
  preview: Timeline;
}

/**
 * The sidebar's Route line section: what the line passes, by the rule the save will apply, seen
 * first and stored the same. Until it passes a place between its ends, a line under it says how
 * one gets there.
 */
export function SaveTimeline({ isLoop, loopPlacesCount, preview }: SaveTimelineProps) {
  const headingId = useId();
  const emptyHint = emptyTimelineHint(isLoop, loopPlacesCount, preview.between.length);
  return (
    <section
      data-testid="save-timeline"
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <h3 id={headingId} className="text-xl/7 font-semibold text-content-primary">
        Route line
      </h3>
      <RouteLine timeline={preview} />
      {emptyHint && <p className="text-xs text-content-quaternary">{emptyHint}</p>}
    </section>
  );
}

function emptyTimelineHint(
  isLoop: boolean,
  loopPlacesCount: number,
  passed: number,
): string | null {
  if (isLoop)
    return loopPlacesCount === 0
      ? 'Goes round no place yet — draw a hintuan across the road and it appears here.'
      : null;
  return passed === 0
    ? 'Passes through no hintuan yet — draw one across the road and it appears here.'
    : null;
}
